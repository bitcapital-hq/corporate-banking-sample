import Bitcapital, { User, Session, StorageUtil, MemoryStorage } from "bitcapital-core-sdk";
import { Person, PersonType, Company } from "../api/models";
import DomainService from "../api/services/DomainService";
import Config from '../config';

export default class BitCapital {

    private static instance: BitCapital;
    private bitcapitalClient: Bitcapital;

    public static async initialize() {
        BitCapital.instance = new BitCapital();

        const session = new Session({
            storage: new StorageUtil("session", new MemoryStorage()),
            http: Config.linx.credentials,
            oauth: Config.linx.credentials
        });
        BitCapital.instance.bitcapitalClient = Bitcapital.initialize({ 
            session: session, 
            ...Config.linx.credentials 
        });
        await BitCapital.instance.bitcapitalClient.session().clientCredentials();
        
        return BitCapital.instance;
    }

    public static getInstance(): BitCapital {
        if(!BitCapital.instance) {
            throw new Error("BitCapital instance not initialized!");
        }
        return BitCapital.instance;
    }

    public getClient(): Bitcapital {
        return this.bitcapitalClient;
    }

    public async authenticateUser(person: Person): Promise<User> {
        const remoteUser = await this.bitcapitalClient
        .session()
        .password({
            username: person.email,
            password: person.passwordHash,
        });

        if(person.type != PersonType.ACCOUNTABLE)
            await this.reset(person.sender);

        return remoteUser;
    }

    private async reset(domain: Company) {
        const accountable = await DomainService.getInstance()
        .findAccountable(domain.id);

        await this.bitcapitalClient.session().password({
            username: accountable.email,
            password: accountable.passwordHash
        });
    }
}