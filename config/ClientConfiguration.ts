import Bitcapital, { User, Session, StorageUtil, MemoryStorage } from "bitcapital-core-sdk";
import { Person, PersonType, Company } from "../api/models";
import DomainService from "../api/services/DomainService";

const credentials = {
    baseURL: 'https://testnet.btcore.app',
    clientId: 'meubanquinho',
    clientSecret: '68ef4ff6-98c8-4617-ad7d-5e23b28b3a1e',
}

const session = new Session({
    storage: new StorageUtil("session", new MemoryStorage()),
    http: credentials,
    oauth: credentials
});

let bitcapitalClient: Bitcapital;

async function initialize() {
    bitcapitalClient = Bitcapital.initialize({ session, ...credentials });
    await bitcapitalClient.session().clientCredentials();
}

export async function getBitcapitalAPIClient() {
    if(!bitcapitalClient) {
        await initialize();
    }
    return bitcapitalClient;
}

export async function authenticateUser(person: Person): Promise<User> {
    const client = await getBitcapitalAPIClient();
    const remoteUser = await client.session().password({
        username: person.email,
        password: person.passwordHash,
    });

    if(person.type != PersonType.ACCOUNTABLE)
        await reset(person.sender);

    return remoteUser;
}

async function reset(domain: Company) {
    const accountable = await DomainService.getInstance()
    .findAccountable(domain.id);

    await bitcapitalClient.session().password({
        username: accountable.email,
        password: accountable.passwordHash
    });
}
