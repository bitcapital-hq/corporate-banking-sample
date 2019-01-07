import { Repository, getRepository } from "../../node_modules/typeorm";
import Salary from "../models/Salary";
import { Person, Payment, PersonType } from "../models";
import PaymentService from "./PaymentService";
import * as Bluebird from "bluebird";

export default class PayrollService {

    private static instance: PayrollService;
    private salaryRepository: Repository<Salary>;

    constructor() {
        this.salaryRepository = getRepository(Salary);
    }

    private static initialize() {
        PayrollService.instance = new PayrollService();
    }

    public static getInstance() {
        if(!this.instance) PayrollService.initialize();
        return PayrollService.instance;
    }

    public async getCurrent(employee: Person): Promise<Salary> {
        return await this.current(employee.id);
    }

    public async update(employee: Person, amount: string | number): Promise<Salary> {
        if(employee.type != PersonType.EMPLOYEE) {
            throw new Error("The given person is not an employee");
        }

        const currentSalary = await this.getCurrent(employee);

        let newSalary: Salary;
        try {
            newSalary = new Salary({
                employee: employee,
                amount: typeof amount === 'string'? amount:amount.toString()
            });
            newSalary = await this.salaryRepository.save(newSalary);

            if(currentSalary) {
                currentSalary.validUntil = new Date();
                currentSalary.current = false;
                await this.salaryRepository.save(currentSalary);
            }

        } catch(error) {
            console.dir(error);
            throw new Error(`Error while trying do send payment to employee ${employee.id}`);
        }

        return newSalary;
    }

    public async payEmployees(employees?: Person[]): Promise<Payment[]> {
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
        const payments = await Bluebird.all(paymentPromises);

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