import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "../../node_modules/typeorm";
import { IsEnum, IsNotEmpty } from "../../node_modules/class-validator";
import { Person } from ".";

export enum PhoneType {
    MOBILE = "mobile",
    HOME = "home",
    WORK = "work"
}

@Entity(Phone.TABLE_NAME)
export default class Phone {
    private static readonly TABLE_NAME = "phones";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @IsNotEmpty()
    @IsEnum(PhoneType)
    @Column("enum", { enum: PhoneType, default: PhoneType.MOBILE, nullable: false })
    type: PhoneType = PhoneType.MOBILE;

    @Column("text", { name: "area_code" })
    areaCode: string;

    @Column("text", { name: "country_code", default: "55" })
    contryCode: string = "55";

    @Column("text")
    number: string;

    @ManyToOne(type => Person, owner => owner.phones, { onDelete: "CASCADE" })
    owner: Person;

    constructor(data: Partial<Phone> = {}) {
        Object.assign(this, data);
    }

    public toJSON(): Partial<Phone> {
        return {
            id: this.id,
            type: this.type,
            contryCode: this.contryCode,
            areaCode: this.areaCode,
            number: this.number
        };
      }

}