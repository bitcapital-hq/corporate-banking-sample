import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "../../node_modules/typeorm";
import { IsNotEmpty, IsOptional, IsEnum } from "../../node_modules/class-validator";
import { Person } from ".";

export enum AddressType {
    HOME = "home",
    WORK = "work"
}

@Entity(Address.TABLE_NAME)
export default class Address {
    private static readonly TABLE_NAME = "addresses";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @IsNotEmpty()
    @IsEnum(AddressType)
    @Column("enum", { nullable: false, enum: AddressType, default: AddressType.HOME })
    type: AddressType = AddressType.HOME;

    @IsNotEmpty()
    @ManyToOne(type => Person, owner => owner.addresses, { onDelete: "CASCADE", nullable: false })
    owner: Person;

    @IsNotEmpty()
    @Column("text", { default: "BR", nullable: false })
    country: string = "BR";
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    state: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    city: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    code: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    neighborhood: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    street: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: true })
    complement: string;
  
    @IsNotEmpty()
    @Column("text", { nullable: false })
    number: string;
  
    constructor(data: Partial<Address> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): Partial<Address> {
        return {
          id: this.id,
          type: this.type,
          country: this.country,
          state: this.state,
          city: this.city,
          neighborhood: this.neighborhood,
          code: this.code,
          street: this.street,
          complement: this.complement,
          number: this.number
        };
      }
    
}

