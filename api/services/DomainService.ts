import CompanyMapper from "../integrations/bitcapital/mappers/CompanyMapper";
import { Repository, getRepository } from "../../node_modules/typeorm";
import { Company, CompanyStatus, Person, Accountable } from "../models";
import WalletMapper from "../integrations/bitcapital/mappers/WalletMapper";
import Bitcapital from "bitcapital-core-sdk";
import PersonService from "./PersonService";
import { LoggerInstance } from "ts-framework-common";

export interface DomainServiceOptions {
    logger: LoggerInstance;
  }

export default class DomainService {

    private logger: LoggerInstance;
    private static instance: DomainService;

    private companyRepositoty: Repository<Company>;
    private companyMapper: CompanyMapper;
    private walletMapper: WalletMapper;
    private bitcapital: Bitcapital;
  
    constructor(options: DomainServiceOptions) {
        this.logger = options.logger;
        this.companyRepositoty = getRepository(Company);
        this.companyMapper = new CompanyMapper();
        this.walletMapper = new WalletMapper();
    }
  
    public static initialize(options: DomainServiceOptions) {
        if(!DomainService.instance) {
            DomainService.instance = new DomainService(options);
        }
        return DomainService.instance;
    }
  
    public static getInstance() {
        if(!DomainService.instance) {
            throw new Error("DomainService instance not initialized!");
        }
        return DomainService.instance;
    }
  
    public async createDomain(domainData: Company): Promise<Company> {
        domainData.status = CompanyStatus.ACTIVE;
        return await this.companyRepositoty.save(domainData);
    }

    public async createMediator(
        domain: Company, 
        personData: Person, 
        password: string): Promise<Person> {

        let mediator: Person;
        try {            
            const personService: PersonService = PersonService.getInstance();
            mediator = await personService.create(domain, personData, password);

            domain.accountable = new Accountable(mediator.id);
            await this.companyRepositoty.save(domain);
            mediator = await personService.findById(mediator.id);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error creating mediator: ${message}`, 
            personData.toJSON(), error);
            throw error;
        }

        return mediator;
    }

    public async addRecipient(domain: Company | string, person: Person) {
        try {
            domain = await this.findById(typeof domain === 'string'? domain:domain.id);

            if(!domain || domain.status != CompanyStatus.ACTIVE) 
            throw new Error("The given domain is invalid or is not active");
        
            domain.addRecipient(person);
            this.companyRepositoty.save(domain);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error adding recipient to domain: ${message}`, person.toJSON(), error);
            throw error;
        }

        return domain;
    }

    public async update(updatedCompany: Company): Promise<Company> {
      return await this.companyRepositoty.save(updatedCompany);
    }
  
    public async findAccountable(id: string): Promise<Person> {
        const accountable = await getRepository(Accountable)
        .findOne({
            where: { liability: { id: id } },
            relations: [ "liability" ]
        });
        return await accountable.getPerson();
    }

    public async findByAccountable(id: string): Promise<Company> {
        const accountable = await getRepository(Accountable)
        .findOne({
            where: { person: id },
            relations: ["liability", "liability.accountable"]
        });
        return accountable.liability;
    } 

    public async findById(id: string): Promise<Company> {
        return await this.companyRepositoty
        .findOne({
            where: { id: id },
            relations: [ "accountable", "recipients" ]
        });
    } 
}