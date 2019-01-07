import { Entity, OneToOne, PrimaryGeneratedColumn, Column, getRepository, DeepPartial } from "typeorm";
import { Company, Person } from ".";
import { IsNotEmpty } from "class-validator";

@Entity(Accountable.TABLE_NAME)
export default class Accountable {
    private static readonly TABLE_NAME = "accountable";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @OneToOne(type => Company, company => company.accountable, { onDelete: "CASCADE" })
    liability: Company;

    @IsNotEmpty()
    @Column({ nullable: false })
    person: string;

    public async getPerson(): Promise<Person> {
        return await getRepository(Person)
        .findOne({ 
            where: { id: this.person },
            relations: ["sender", "phones", "bankAccount", "addresses", "documents", "wallet"] 
          });
    }

    constructor(personId: string) {
        this.person = personId;        
    }

    public toJSON(): DeepPartial<Accountable> {
        return {
            id: this.id,
            liability: this.liability? this.liability.toJSON():this.liability,
            person: this.person
        };
    }
}