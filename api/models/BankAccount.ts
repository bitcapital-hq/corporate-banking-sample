import { ManyToOne, Entity, Column, PrimaryGeneratedColumn } from "../../node_modules/typeorm";
import { IsNotEmpty, IsOptional } from "../../node_modules/class-validator";
import { Person } from ".";

@Entity(BankAccount.TABLE_NAME)
export default class BankAccount {
    private static readonly TABLE_NAME = "bank_accounts";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @IsOptional()
    @Column({ name: "external_id", nullable: true })
    externalId?: string;

    @ManyToOne(type => Person, owner => owner.bankAccount, { onDelete: "CASCADE" })
    owner: Person;

    @IsNotEmpty()
    @Column()
    bank: string;

    @IsNotEmpty()
    @Column()
    branch: string;

    @IsNotEmpty()
    @Column({ name: "branch_digit", nullable: true })
    branchDigit: string;

    @IsNotEmpty()
    @Column()
    number: string;

    @IsNotEmpty()
    @Column({ nullable: true })
    digit: string;

    constructor(data: Partial<BankAccount> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): Partial<BankAccount> {
        return {
            id: this.id,
            bank: this.bank,
            branch: this.branch,
            branchDigit: this.branchDigit,
            number: this.number,
            digit: this.digit            
        };
      }
}
