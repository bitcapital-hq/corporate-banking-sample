import CompanyMapper from "../integrations/bitcapital/mappers/CompanyMapper";
import { Repository, getRepository } from "../../node_modules/typeorm";
import { Company, CompanyStatus, Person, Accountable } from "../models";
import WalletMapper from "../integrations/bitcapital/mappers/WalletMapper";
import Bitcapital from "bitcapital-core-sdk";
import { getBitcapitalAPIClient } from "../../config";
import PersonService from "./PersonService";

export default class DomainService {

    private static instance: DomainService;

    private companyRepositoty: Repository<Company>;
    private companyMapper: CompanyMapper;
    private walletMapper: WalletMapper;
    private bitcapital: Bitcapital;
  
    constructor() {
        this.companyRepositoty = getRepository(Company);
        this.companyMapper = new CompanyMapper();
        this.walletMapper = new WalletMapper();
    }
  
    public static initialize() {
      if(!DomainService.instance)
        DomainService.instance = new DomainService();
    }
  
    public static getInstance() {
        DomainService.initialize();
      return DomainService.instance;
    }
  
    public async createDomain(domainData: Company): Promise<Company> {
        domainData.status = CompanyStatus.ACTIVE;
        return await this.companyRepositoty.save(domainData);
    }

    public async createMediator(domain: Company, personData: Person, password: string): Promise<Person> {
        const personService: PersonService = PersonService.getInstance();
        const mediator = await personService.create(domain, personData, password);

        domain.accountable = new Accountable(mediator.id);
        await this.companyRepositoty.save(domain);

        return await personService.findById(mediator.id);
    }

    public async addRecipient(domain: Company | string, person: Person) {
        domain = await this.findById(typeof domain === 'string'? domain:domain.id);

        if(!domain || domain.status != CompanyStatus.ACTIVE) 
          throw new Error("The given domain is invalid or is not active");
    
        domain.addRecipient(person);
        this.companyRepositoty.save(domain);
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