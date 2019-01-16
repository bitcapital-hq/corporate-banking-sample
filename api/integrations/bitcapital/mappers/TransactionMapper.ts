import { DeepPartial } from "../../../../node_modules/typeorm";
import { 
    Transaction as RemoteTransaction, 
    TransactionType, 
    Payment as RemotePayment,
    Recipient as RemoteRecipient, 
    Wallet} from "bitcapital-core-sdk";

export interface TransactionSchema {
    id: string;
    data?: string;
    type: TransactionType;
    source: string;
    payments?: PaymentSchema[];
    createdAt: Date;
    updatedAt: Date;
}

interface PaymentSchema {
    id: string;
    source: string | undefined;
    recipients: RecipientSchema[];
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

interface RecipientSchema {
    id: string;
    amount: string;
    destination: string | undefined;
    createdAt: Date;
    updatedAt: Date;
}

export default class TransactionMapper {

    public static toLocalTransactionSchema(remote: RemoteTransaction): 
    DeepPartial<TransactionSchema> {
        return {
            id: remote.id,
            type: remote.type,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            source: remote.source.id,
            payments: remote.payments? remote.payments.map(payment => 
                TransactionMapper.toLocalPaymentSchema(payment)):undefined
        }; 
    }

    public static toLocalPaymentSchema(remote: RemotePayment): 
    DeepPartial<PaymentSchema> {
        return {
            id: remote.id,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            source: remote.source instanceof Wallet? 
                    remote.source.id : remote.source,
            totalAmount: remote.totalAmount,
            recipients: remote.recipients.map(recipient => 
                TransactionMapper.toLocalRecipientSchema(recipient))
        };
    }

    public static toLocalRecipientSchema(remote: RemoteRecipient): 
    DeepPartial<RecipientSchema> {
        return {
            id: remote.id,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            amount: remote.amount,
            destination: remote.destination instanceof Wallet? 
                         remote.destination.id:remote.destination
        };
    }

}