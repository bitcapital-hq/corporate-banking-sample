import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from "../../node_modules/typeorm";
import { Boleto, Payment, Person } from ".";
import { IsOptional, IsNotEmpty, IsEnum } from "../../node_modules/class-validator";

export enum WalletStatus {
  PENDING = "pending",
  REGISTERED = "registered",
  READY = "ready",
  FAILED = "failed"
}

@Entity(Wallet.TABLE_NAME)
export default class Wallet {
  private static readonly TABLE_NAME = "wallets";

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @IsOptional()
  @Column({ name: "external_id", nullable: true })
  externalId?: string;

  @IsNotEmpty()
  @OneToOne(type => Person, person => person.wallet, { onDelete: "CASCADE", nullable: false })
  owner: Person;

  @OneToMany(type => Payment, payment => payment.sender, { cascade: [ "insert", "update" ] })
  payments: Payment[];

  @OneToMany(type => Payment, payment => payment.recipient, { cascade: [ "insert", "update" ] })
  receipts: Payment[];

  @OneToMany(type => Boleto, bankSlip => bankSlip.recipient, { cascade: [ "insert", "update" ] })
  bankSlips: Boleto[];

  @IsNotEmpty()
  @IsEnum(WalletStatus)
  @Column("enum", { enum: WalletStatus, default: WalletStatus.PENDING, nullable: false })
  status: WalletStatus = WalletStatus.PENDING;

  constructor(data: Partial<Wallet> = {}) {
    Object.assign(this, data);
  }

  public toJSON(): Partial<Wallet> {
    return {
        status: this.status,
        externalId: this.externalId,
        id: this.id
    };
  }

}