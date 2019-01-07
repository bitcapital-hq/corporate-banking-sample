import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, DeepPartial, CreateDateColumn, UpdateDateColumn } from "../../node_modules/typeorm";
import { Wallet } from ".";
import { IsNotEmpty, IsEnum, IsOptional } from "../../node_modules/class-validator";

export enum BoletoStatus { 
    ISSUED = "issued", 
    EXPIRED = "expired", 
    PAID = "paid" 
}

@Entity(Boleto.TABLE_NAME)
export default class Boleto {
    private static readonly TABLE_NAME = "boletos";  

    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @IsOptional()
    @Column({ name: "external_id", nullable: true })
    externalId?: string;

    @IsNotEmpty()
    @ManyToOne(type => Wallet, recipient => recipient.bankSlips, { 
        onDelete: "SET NULL", 
        nullable: false 
    })
    recipient: Wallet;

    @IsNotEmpty()
    @Column({ nullable: false })
    amount: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
  
    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @IsNotEmpty()
    @Column("timestamp with time zone", { name: "expires_at", nullable: false })
    expiresAt?: Date;

    @IsNotEmpty()
    @Column({ default: false, nullable: false })
    registered: boolean = false;

    @IsOptional()
    @Column("timestamp with time zone", { name: "paid_at", nullable: true })
    paidAt?: Date;

    @IsOptional()
    @Column({ name: "amount_paid", nullable: true })
    amountPaid?: string;
    
    @IsNotEmpty()
    @IsEnum(BoletoStatus)
    @Column("enum", { nullable: false, enum: BoletoStatus, default: BoletoStatus.ISSUED })
    status: BoletoStatus = BoletoStatus.ISSUED;

    constructor(data: Partial<Boleto> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): DeepPartial<Boleto> {
        return {
            id: this.id,
            externalId: this.externalId,
            recipient: this.recipient.toJSON(),
            amount: this.amount,
            amountPaid: this.amountPaid || "",
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            paidAt: this.paidAt || "",
            registered: this.registered,
            status: this.status
        };
      }
}