import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, DeepPartial } from "../../node_modules/typeorm";
import { Accountable, Person } from ".";
import { IsOptional, IsNotEmpty, IsEnum } from "../../node_modules/class-validator";

export enum CompanyStatus {
    DOMAIN_PENDING = "domain_pending",
    MEDIATOR_PENDING = "mediator_pending",
    ACTIVE = "active",
    DISABLED = "disabled"
}

@Entity(Company.TABLE_NAME)
export default class Company {
    private static readonly TABLE_NAME = "companies";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @IsOptional()
    @Column({ name: "external_id", nullable: true })
    externalId?: string;
    
    @IsOptional()
    @OneToOne(type => Accountable, accoutable => accoutable.liability, { 
        cascade: [ "insert", "update" ],
        nullable: true
    })
    @JoinColumn()
    accountable: Accountable;

    @IsNotEmpty()
    @Column({ nullable: false })
    name: string;
    
    @IsNotEmpty()
    @Column({ nullable: false })
    website: string;

    @OneToMany(type => Person, recipient => recipient.sender, { 
        cascade: [ "insert", "update" ] 
    })
    recipients?: Person[];

    @IsNotEmpty()
    @IsEnum(CompanyStatus)
    @Column("enum", { nullable: false, enum: CompanyStatus, default: CompanyStatus.DOMAIN_PENDING })
    status: CompanyStatus = CompanyStatus.DOMAIN_PENDING;

    public addRecipient(recipient: Person) {
        this.recipients.push(recipient);
    }

    constructor(data: Partial<Company> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): DeepPartial<Company> {
        return {
            id: this.id,
            externalId: this.externalId,
            name: this.name,
            accountable: this.accountable? this.accountable.toJSON():this.accountable,
            recipients: this.recipients? 
            this.recipients.map(recipient => recipient.toSimpleJSON()):this.recipients,
            status: this.status
        };
    }

    public toSimpleJSON(): DeepPartial<Company> {
        return {
            id: this.id,
            externalId: this.externalId,
            name: this.name,
            status: this.status
        };
    }
}
