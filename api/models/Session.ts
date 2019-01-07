import { Entity, PrimaryGeneratedColumn, Column } from "../../node_modules/typeorm";

@Entity(Session.TABLE_NAME)
export default class Session {
    private static readonly TABLE_NAME = "sessions";

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ nullable: false })
    email: string;

    @Column({ nullable: false })
    token: string;

    @Column("timestamp with time zone", { name: "created_at", nullable: false })
    createdAt: Date;

    @Column({ name: "is_valid", default: true, nullable: false })
    isValid: boolean = true;

    constructor(data: Partial<Session> = {}) {
        this.createdAt = new Date();
        Object.assign(this, data);
    }
}