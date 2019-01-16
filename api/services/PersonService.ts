import Bitcapital, { User } from "bitcapital-core-sdk";
import { Person, PersonType, Wallet, Company, Document, DocumentStatus, PersonStatus } from "../models";
import { DeleteResult, getRepository, Repository } from "../../node_modules/typeorm";
import { default as BitCapital } from "../BitCapital";
import PersonMapper from "../integrations/bitcapital/mappers/PersonMapper";
import DomainService from "./DomainService";
import { Logger, LoggerInstance } from "ts-framework-common";

export interface PersonServiceOptions {
  logger: LoggerInstance;
}

export default class PersonService {

  //private static logger = Logger.getInstance();
  private logger: LoggerInstance;

  private static ROOT_ASSET = "BRLD";
  private static instance: PersonService;

  private personRepository: Repository<Person>;
  private domainRepository: Repository<Company>;
  private personMapper: PersonMapper;
  private bitcapitalClient: Bitcapital;
  
  constructor(options: PersonServiceOptions) {
    this.logger = options.logger;
    this.bitcapitalClient = BitCapital.getInstance().getClient();
    this.personRepository = getRepository(Person);
    this.domainRepository = getRepository(Company);
    this.personMapper = new PersonMapper();
  }

  public static initialize(options: PersonServiceOptions) {
    PersonService.instance = new PersonService(options);
    return PersonService.instance;
  }

  public static getInstance() {
    if(!PersonService.instance) {
      throw new Error("PersonService instance not initialized!");
    }
    return PersonService.instance;
  }

  public async create(domain: Company, person: Person, password: string): Promise<Person> {

    const domainService = DomainService.getInstance();
    try {
      domain = await domainService.findById(domain.id);
      await person.savePassword(password);

      if(person.type != PersonType.ACCOUNTABLE) {
        const user: User = await this.bitcapitalClient.consumers()
        .create(this.personMapper.fromPersonToUser(person, domain));

        person.externalId = user.id;
        person.wallet = new Wallet({
          externalId: user.wallets[0].id
        });
      }

      if(person.type != PersonType.ACCOUNTABLE) {
        domain.addRecipient(person);
        await this.domainRepository.save(domain);
      } else {
        await this.personRepository.save(person);
      }

    } catch(error) {
      const message = error.message || error.data && error.data.message;
      this.logger.error(`Error creating person: ${message}`, person.toSimpleJSON(), error);
      throw error;
    }
    
    return this.findByEmail(person.email);
  }

  public async addDocument(person: Person, doc: Document, side: "front" | "back"): 
  Promise<Person> {
    person = await this.findById(person.id);

    try {
      const remotePerson = await this.bitcapitalClient
        .consumers()
        .findOne(person.externalId);
        
      const uploadedDoc = await this.bitcapitalClient
        .consumers()
        .createDocument(
          person.externalId,
          {
            type: PersonMapper.toRemoteDocType(doc.type),
            number: doc.number,
            front: doc.front,
            back: doc.back
          } 
        );

      doc.externalId = uploadedDoc.id;
      person.addDocument(doc);
      await this.personRepository.save(person);

    } catch(error) {
      const message = error.message || error.data && error.data.message;
      this.logger.error(`Error associating new document to person (${person.id}) record: ${message}`, doc && doc.toJSON(), error);
      throw error;
    }
        
    return person;
  }

  public async checkPersonDocumentsStatus(person: Person): Promise<Document[]> {
    person = await this.findById(person.id);
    const personDocs: Document[] = person.documents;

    try {
      const uploadedDocs = await this.bitcapitalClient.consumers()
      .findDocumentsById(person.externalId);

      uploadedDocs.forEach(uploadedDoc => {
        if(uploadedDoc.isValid()) {
          const personDoc = personDocs.find(doc => 
            doc.externalId == uploadedDoc.id
            && doc.status != DocumentStatus.VERIFIED);
            
          if(personDoc) 
            personDoc.status = DocumentStatus.VERIFIED;
          } 
      });
      await this.personRepository.save(person);

    } catch(error) {
      const message = error.message || error.data && error.data.message;
      this.logger.error(`Error retrieving/updating person documents: ${message}`, person.toSimpleJSON(), error);
      throw error;
    }

    return person.documents;
  }

  /**
   * TODO
   * 
   * @param person 
   */
  public async checkBalance(person: Person): Promise<string> {

    let balance: string;
    try {
      const personWallet = await this.bitcapitalClient
        .wallets()
        .findOne(person.wallet.externalId);
      const walletBalance = personWallet.balances
        .find(balance => balance.asset_code == PersonService.ROOT_ASSET);
      balance = Number(walletBalance.balance).toFixed(2);

    } catch(error) {
      const message = error.message || error.data && error.data.message;
      this.logger.error(`Error retrieving person account balance: ${message}`, `person ID: ${person.id}`, error);
      throw error;
    }
  
    return balance;
  }

  public async findById(id: string): Promise<Person> {
    return await this.personRepository
    .findOne({ 
      where: { id: id },
      relations: ["sender", "phones", "bankAccount", "addresses", "documents", "wallet"] 
    });
}

  public async findByExternalId(externalId: string): Promise<Person> {
      return await this.personRepository
      .findOne({ 
        where: { externalId: externalId },
        relations: ["sender", "phones", "bankAccount", "addresses", "documents", "wallet"] 
      });
  }

  public async findByEmail(email: string): Promise<Person> {
      return await this.personRepository
      .findOne({ 
        where: { email: email },
        relations: ["phones", "bankAccount", "addresses", "documents", "wallet", "sender"]
      });
  }

  public async findEmployees(): Promise<[Person[], number]> {
    return await this.findByType(PersonType.EMPLOYEE);
  }
  
  public async findSuppliers(): Promise<[Person[], number]> {
    return await this.findByType(PersonType.SUPPLIER);
  }

  public async findByType(type: PersonType): Promise<[Person[], number]> {
      return await this.personRepository
      .findAndCount({ 
        where: { type: type },
        relations: ["sender", "phones", "bankAccount", "addresses", "documents", "wallet"] 
      });
    }

  public async findByStatus(status: PersonStatus): Promise<[Person[], number]> {
      return await this.personRepository
      .findAndCount({ 
        where: { status: status },
        relations: ["sender", "phones", "bankAccount", "addresses", "documents", "wallet"] 
      });
  }

  /**
   * TODO
   * Use soft delete
   * 
   * @param id the person ID 
   */
  public async delete(id: string): Promise<DeleteResult> {
    return await this.personRepository.delete(id);
  }

  public async findByDomain(
    domain: string, 
    filters: any, 
    offset: number, 
    limit: number): Promise<[Person[], number]> {

    let qb = this.personRepository
      .createQueryBuilder("person")
      .innerJoinAndSelect("person.sender", "sender")
      .leftJoinAndSelect("person.phones", "phones")
      .leftJoinAndSelect("person.bankAccount", "bankAccount")
      .leftJoinAndSelect("person.addresses", "addresses")
      .leftJoinAndSelect("person.documents", "documents")
      .leftJoinAndSelect("person.wallet", "wallet")
      .where("person.sender.id = :id", { id: domain });

    if(filters.type) {
      qb = qb.andWhere("person.type = :type", { type: filters.type });
    }

    if(filters.status) {
      qb = qb.andWhere("person.status = :status", { status: filters.status });
    }

    return await qb
      .offset(offset)
      .limit(limit)
      .orderBy("person.firstName", "ASC")
      .getManyAndCount();
  }

}