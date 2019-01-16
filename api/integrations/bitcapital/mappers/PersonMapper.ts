import { Person, Company, Address, PersonType, DocumentType } from "../../../models";
import { 
    Consumer, 
    User, 
    UserRole, 
    Address as RemoteAddress, 
    Phone as RemotePhone, 
    Document as RemoteDocument, 
    DocumentType as RemoteDocType } from "bitcapital-core-sdk";
import CompanyMapper from "./CompanyMapper";
import Accountable from "../../../models/Accountable";

export default class PersonMapper {

    private companyMapper: CompanyMapper;

    constructor() {
        this.companyMapper = new CompanyMapper();
    }

    public fromPersonToUser(person: Person, company: Company): User {
        return new User({
            domain: this.companyMapper.toDomain(company),
            firstName: person.firstName,
            lastName: person.lastName,
            password: person.passwordHash,
            consumer: person.type == PersonType.ACCOUNTABLE? null:this.fromPersonToConsumer(person),
            role: person.type == PersonType.ACCOUNTABLE? UserRole.MEDIATOR:UserRole.CONSUMER,
            email: person.email
        });
    }

    public fromPersonToConsumer(person: Person): Consumer {
        return new Consumer({
            taxId: person.taxId,
            addresses: person.addresses? this.fromLocalToRemoteAddress(person):[],
            phones: person.phones? this.fromLocalToRemotePhone(person):[],
            documents: person.documents? this.fromLocalToRemoteDocs(person):[],
        });
    }

    public fromLocalToRemoteAddress(person: Person): RemoteAddress[] {
        return person.addresses.map(address => new RemoteAddress({
            type: address.type,
            street: address.street,
            number: address.number,
            complement: address.complement,
            code: address.code,
            city: address.city,
            state: address.state,
            country: address.country
        }));
    }

    public fromLocalToRemotePhone(person: Person): RemotePhone[] {
        return person.phones.map(phone => new RemotePhone({
            type: phone.type,
            code: phone.areaCode,
            number: phone.number
        }));
    }

    public fromLocalToRemoteDocs(person: Person): RemoteDocument[] {
        return person.documents.map(doc => new RemoteDocument({
            type: PersonMapper.toRemoteDocType(doc.type),
            number: doc.number,
            front: doc.front,
            back: doc.back
        }));
    }

    public static toRemoteDocType(type: DocumentType): RemoteDocType {
        switch(type) {
            case DocumentType.ADDRESS_PROOF:
                return RemoteDocType.BRL_ADDRESS_STATEMENT;
            
            case DocumentType.IDENTITY: 
                return RemoteDocType.BRL_INDIVIDUAL_REG;
            
            case DocumentType.PASSPORT:
                return RemoteDocType.BRL_IDENTITY;
                
            case DocumentType.DRIVER_LICENSE:
                return RemoteDocType.BRL_IDENTITY;
        }
    }

    public async fromAccountableToMediator(accountable: Accountable, company: Company): Promise<User> {
        const person = await accountable.getPerson();
        return new User({
            domain: this.companyMapper.toDomain(company),
            firstName: person.firstName,
            lastName: person.lastName,
            password: person.passwordHash,
            role: UserRole.MEDIATOR,
            email: person.email,
        });
    }

}