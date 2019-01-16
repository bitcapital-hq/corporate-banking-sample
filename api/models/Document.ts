import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "../../node_modules/typeorm";
import { IsOptional, IsNotEmpty, IsEnum } from "../../node_modules/class-validator";
import { Person } from ".";

export enum DocumentStatus {
    PROCESSING = "processing",
    VERIFIED = "verified",
    DELETED_BY_USER = "deleted_by_user",
    PENDING_INFORMATION = "pending_information",
    FAILED_VERIFICATION = "failed_verification"
}

export enum DocumentType {
    IDENTITY = "identity",
    DRIVER_LICENSE = "drivers_license",
    ADDRESS_PROOF = "address_proof",
    PASSPORT = "passport"
}

@Entity(Document.TABLE_NAME)
export default class Document {
    private static readonly TABLE_NAME = "documents";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "external_id", nullable: true } )
    externalId?: string;

    @IsNotEmpty()
    @IsEnum(DocumentType)
    @Column("enum", { enum: DocumentType, nullable: false })
    type: DocumentType;

    @IsNotEmpty()
    @Column({ name: "file_name", nullable: true })
    fileName?: string;
    
    @IsOptional()
    @Column({ nullable: true })
    number?: string;
    
    @Column({ nullable: true })
    front?: string;

    @Column({ nullable: true })
    back?: string;

    @IsOptional()
    @Column("timestamp with time zone", { nullable: true })
    expiresAt?: Date;
  
    @ManyToOne(type => Person, owner => owner.documents, { onDelete: "CASCADE" })
    owner: Person;

    @IsNotEmpty()
    @IsEnum(DocumentType)
    @Column("enum", { enum: DocumentStatus, default: DocumentStatus.PROCESSING, nullable: false })
    status: DocumentStatus = DocumentStatus.PROCESSING;

    constructor(data: Partial<Document> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): Partial<Document> {
        return {
            id: this.id,
            number: this.number,
            expiresAt: this.expiresAt,
            status: this.status,
            fileName: this.fileName
        };
      }
}