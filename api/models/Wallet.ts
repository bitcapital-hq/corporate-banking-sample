import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity(Wallet.TABLE_NAME)
export default class Wallet {
  private static readonly TABLE_NAME = "wallets";

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  owner: string;

  @Column("simple-array")
  transactions: string[];

  @Column()
  balance: number;

  constructor(data: Partial<Wallet> = {}) {
    Object.assign(this, data);
  }
}