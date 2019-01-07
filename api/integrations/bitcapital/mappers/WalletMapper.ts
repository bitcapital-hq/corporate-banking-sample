import { Wallet as RemoteWallet } from "bitcapital-core-sdk";
import { Wallet } from "../../../models";
import { PersonService } from "../../../services";

export default class WalletMapper {

    public async toLocal(remote: RemoteWallet): Promise<Wallet> {
        const holderId = typeof remote.user === 'string'? remote.user:remote.user.id;
        const holder = await PersonService.getInstance().findByExternalId(holderId);
        if(!holder) 
            throw new Error("Wallet owner not found!");

        return new Wallet({
            externalId: remote.id,
        });
    }

    public toRemote(local: Wallet): RemoteWallet {
        return new RemoteWallet({
            id: local.externalId,
        });
    }
}