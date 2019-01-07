import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, DeepPartial, CreateDateColumn, UpdateDateColumn } from "../../node_modules/typeorm";
import { Wallet } from ".";
import { IsNotEmpty, IsEnum, IsOptional } from "../../node_modules/class-validator";

export enum PaymentType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    TRANSFER = "transfer",
    SUPPLIER_PAYMENT = "supplier_payment",
    EMPLOYEE_PAYMENT = "employee_payment"
}

export enum PaymentStatus {
    PENDING = "pending",
    EXECUTED = "executed",
    FAILED = "failed"
}

@Entity(Payment.TABLE_NAME)
export default class Payment {
    private static readonly TABLE_NAME = "payments";

    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @IsOptional()
    @Column({ name: "external_id", nullable: true })
    externalId?: string;

    @IsEnum(PaymentType)
    @IsNotEmpty()
    @Column("enum", { enum: PaymentType, nullable: false })
    type: PaymentType; 

    @IsNotEmpty()
    @ManyToOne(type => Wallet, wallet => wallet.payments, { 
        onDelete: "SET NULL",
        nullable: false 
    })
    sender: Wallet;

    @IsNotEmpty()
    @ManyToOne(type => Wallet, wallet => wallet.receipts, { 
        onDelete: "SET NULL", 
        nullable: false 
    })
    recipient: Wallet;

    @IsNotEmpty()
    @Column({ name: "amount", nullable: false })
    amount: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
  
    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;

    @IsEnum(PaymentStatus)
    @IsNotEmpty()
    @Column("enum", { enum: PaymentStatus, default: PaymentStatus.PENDING, nullable: false })
    status: PaymentStatus = PaymentStatus.PENDING;

    constructor(data: Partial<Payment> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): DeepPartial<Payment> {
        return {
            id: this.id,
            externalId: this.externalId,
            sender: this.sender? this.sender.toJSON():this.sender,
            recipient: this.recipient? this.recipient.toJSON():this.recipient,
            amount: this.amount,
            createdAt: this.createdAt,
            status: this.status
        };
      }
}
