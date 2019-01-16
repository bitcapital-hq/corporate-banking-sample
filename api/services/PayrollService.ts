import { Repository, getRepository } from "../../node_modules/typeorm";
import Salary from "../models/Salary";
import { Person, Payment, PersonType } from "../models";
import PaymentService from "./PaymentService";
import * as Bluebird from "bluebird";
import { LoggerInstance } from "ts-framework-common";

export interface PayrollServiceOptions {
    logger: LoggerInstance;
}

export default class PayrollService {

    private logger: LoggerInstance;
    private static instance: PayrollService;
    private salaryRepository: Repository<Salary>;

    constructor(options: PayrollServiceOptions) {
        this.logger = options.logger;
        this.salaryRepository = getRepository(Salary);
    }

    public static initialize(options: PayrollServiceOptions) {
        if(!this.instance) {
            PayrollService.instance = new PayrollService(options);
        }
        return PayrollService.instance;
    }

    public static getInstance() {
        if(!PayrollService.instance) {
            throw new Error("PayrollService instance not initialized!");
        }
        return PayrollService.instance;
    }

    public async getCurrentSalary(employee: Person): Promise<Salary> {
        return await this.current(employee.id);
    }

    public async update(employee: Person, amount: string | number): Promise<Salary> {
        if(employee.type != PersonType.EMPLOYEE) {
            throw new Error("The given person is not an employee");
        }

        let newSalary: Salary;
        try {
            const currentSalary = await this.getCurrentSalary(employee);

            newSalary = new Salary({
                employee: employee,
                amount: typeof amount === 'string'? amount:amount.toFixed(2)
            });
            newSalary = await this.salaryRepository.save(newSalary);

            if(currentSalary) {
                currentSalary.validUntil = new Date();
                currentSalary.current = false;
                await this.salaryRepository.save(currentSalary);
            }

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error updating employee salary: ${message}`, 
            { employeeId: employee.id, amount: amount }, error);
            throw error;
        }

        return newSalary;
    }

    public async payEmployees(employees?: Person[]): Promise<Payment[]> {

        let payments: Payment[];
        try {
            let wages: Salary[], count: number;
            if(employees) {
                const salaryPromises: Promise<Salary>[] = [];
                employees.forEach(employee => 
                    salaryPromises.push(this.current(employee.id)));
                wages = await Bluebird.all(salaryPromises);

            } else {
                [ wages, count ] = await this.currentWages();
            }

            const paymentService = PaymentService.getInstance();
            const paymentPromises: Promise<Payment>[] = [];

            wages.forEach(salary =>
                paymentPromises.push(paymentService
                    .internalPayment(salary.employee, salary.amount)));
            payments = await Bluebird.all(paymentPromises);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error paying wages: ${message}`, error);
            throw error;
        }

        return payments;
    }

    public async current(employeeId: string): Promise<Salary> {
        return await this.salaryRepository
        .findOne({
            where: { 
                employee: { id: employeeId },
                current: true  
            },
            relations: [ "employee", "employee.sender" ]
        });
    } 

    public async currentWages(): Promise<[Salary[], number]> {
        return await this.salaryRepository
        .findAndCount({
            where: { current: true },
            relations: [ "employee", "employee.sender" ]
        });
    } 

    public async history(employeeId: string): Promise<[Salary[], number]> {
        return await this.salaryRepository
        .findAndCount({
            where: { employee: { id: employeeId } },
            relations: [ "employee" ],
            order: { validFrom: "ASC" }
        });
    } 
}