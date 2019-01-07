import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, OneToOne, DeepPartial, JoinColumn, BaseEntity } from "../../node_modules/typeorm";
import { Company, Wallet, Address, BankAccount, Phone, Document, Salary } from ".";
import { IsNotEmpty, IsEnum, IsOptional, Validate, ValidationArguments, ValidatorConstraintInterface, ValidatorConstraint } from "../../node_modules/class-validator";
import * as cpf from "cpf";
import { genHash, genPassword } from "../helpers";
import ExtendedEntity from "./ExtendedEntity";

export enum PersonStatus {
    PENDING = "pending",
    ACTIVE = "active",
    DISABLED = "disabled",
    DELETED = "deleted"
}

export enum PersonType {
    ACCOUNTABLE = "accountable",
    EMPLOYEE = "employee",
    SUPPLIER = "supplier",
    CUSTOMER = "customer"
}

@ValidatorConstraint({ name: "customText", async: false })
class IsCPF implements ValidatorConstraintInterface {
  validate(text: string) {
    return cpf.isValid(text);
  }

  defaultMessage(args: ValidationArguments) {
    return "Value ($value) is not a valid CPF.";
  }
}

@Entity(Person.TABLE_NAME)
export default class Person extends ExtendedEntity {
    private static readonly TABLE_NAME = "people";

    @IsOptional()
    @Column({ name: "external_id", nullable: true })
    externalId?: string;

    @IsNotEmpty()
    @Column({ name: "first_name",  nullable: false })
    firstName: string;
  
    @IsNotEmpty()
    @Column({ name: "last_name",  nullable: false })
    lastName: string;
  
    @Validate(IsCPF)
    @IsNotEmpty()
    @Column({ name: "tax_id",  unique: true, nullable: false })
    taxId: string;
  
    @IsNotEmpty()
    @Column({ unique: true, nullable: false })
    email: string;

    @IsOptional()
    @Column({ name: "password_salt", nullable: true })
    passwordSalt: string;
  
    @IsOptional()
    @Column({ name: "password_hash", nullable: true })
    passwordHash: string;

    @IsNotEmpty()
    @IsEnum(PersonType)
    @Column("enum", { enum: PersonType, default: PersonType.EMPLOYEE, nullable: false })
    type: PersonType = PersonType.EMPLOYEE;

    @IsOptional()
    @OneToMany(type => Phone, phone => phone.owner, { 
        cascade: [ "insert", "update" ],
        nullable: true
    })
    phones?: Phone[];

    @IsOptional()
    @OneToMany(type => Document, document => document.owner, { 
        cascade: [ "insert", "update" ],
        nullable: true
    })
    documents?: Document[];

    @IsNotEmpty()
    @OneToMany(type => Address, address => address.owner, { 
        cascade: [ "insert", "update" ], 
        nullable: false
    })
    addresses: Address[];

    @OneToMany(type => BankAccount, bankAccount => bankAccount.owner, { 
        cascade: [ "insert", "update" ]
    })
    bankAccount: BankAccount[];

    @IsOptional()
    @ManyToOne(type => Company, sender => sender.recipients, { 
        onDelete: "CASCADE", 
        nullable: true
    })
    sender?: Company;

    @OneToOne(type => Wallet, wallet => wallet.owner, { cascade: [ "insert", "update" ] })
    @JoinColumn()
    wallet: Wallet;

    @IsOptional()
    @OneToMany(type => Salary, salary => salary.employee, { 
        cascade: [ "insert", "update" ],
        nullable: true
    })
    salary?: Salary[];

    @IsNotEmpty()
    @IsEnum(PersonStatus)
    @Column("enum", { enum: PersonStatus, default: PersonStatus.PENDING, nullable: false })
    status: PersonStatus = PersonStatus.PENDING;

    constructor(data: Partial<Person> = {}) {
        super(data);
        Object.assign(this, data);
    }

    public fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * Validates if supplied password matches the currently saved one.
     *
     * @param password The password candidate that will be matched
     */
    public async validatePassword(password): Promise<boolean> {
        if (!password || !this.passwordHash || !this.passwordSalt || !this.passwordHash) {
            return false;
        }
        const newHash = await genHash(password, this.passwordSalt);
        return newHash === this.passwordHash;
    }

    /**
     * Hashes the user password.
     *
     * @param password The new password
     */
    public async savePassword(password: string) {
        const { salt, hash } = await genPassword(password);
        this.passwordSalt = salt;
        this.passwordHash = hash;
    }

    public addDocument(doc: Document): Document[] {
        this.documents.push(doc);
        return this.documents;
    }

    public toJSON(): DeepPartial<Person> {
        return {
            addresses: this.addresses? 
                this.addresses.map(address => address.toJSON()): this.addresses,
            phones: this.phones? 
                this.phones.map(phone => phone.toJSON()): this.phones,
            bankAccount: this.bankAccount? 
                this.bankAccount.map(bankAccount => bankAccount.toJSON()):this.bankAccount,
            documents: this.documents? 
                this.documents.map(document => document.toJSON()):this.documents,

            wallet: this.wallet? this.wallet.toJSON():this.wallet,
            sender: this.sender? this.sender.toJSON():this.sender,

            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            status: this.status,
            type: this.type,
            taxId: this.taxId,
            id: this.id,
            externalId: this.externalId
        };
      }

      public toSimpleJSON(): DeepPartial<Person> {
        return {
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            status: this.status,
            taxId: this.taxId,
            id: this.id,
            externalId: this.externalId
        };
      }

}