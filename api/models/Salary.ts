import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, DeepPartial } from "../../node_modules/typeorm";
import { IsNotEmpty, IsOptional } from "../../node_modules/class-validator";
import { Person } from ".";

@Entity(Salary.TABLE_NAME)
export default class Salary {
    private static readonly TABLE_NAME = "wages";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @IsNotEmpty()
    @ManyToOne(type => Person, employee => employee.salary, { 
        cascade: [ "insert", "update" ],
        onDelete: "CASCADE", 
        nullable: false })
    employee: Person;

    @IsNotEmpty()
    @Column({ nullable: false })
    amount: string;
    
    @IsNotEmpty()
    @Column("timestamp with time zone", { name: "valid_from", nullable: false })
    validFrom: Date;
  
    @IsOptional()
    @Column("timestamp with time zone", { name: "valid_until", nullable: true })
    validUntil?: Date;

    @Column({ default: true, nullable: false })
    current: boolean = true;

    constructor(data: Partial<Salary> = {}) {
        this.validFrom = new Date();
        Object.assign(this, data);
    }

    public toJSON(): DeepPartial<Salary> {
        return {
            id: this.id,
            employee: this.employee? this.employee.toJSON():this.employee,
            amount: this.amount,
            current: this.current,
            validFrom: this.validFrom,
            validUntil: this.validUntil
        };
      }
}