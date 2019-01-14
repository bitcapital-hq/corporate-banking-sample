import { Repository, getRepository, Brackets } from "../../node_modules/typeorm";
import Bitcapital, { PaginatedArray, Transaction } from "bitcapital-core-sdk";
import { default as BitCapital } from "../BitCapital";
import { HttpCode, HttpError } from "../../node_modules/ts-framework";
import { ExtendedPaymentWebService, DomainService, PersonService } from ".";
import { 
    Person, 
    PersonType, 
    Boleto, 
    Payment, 
    PaymentType, 
    BoletoStatus, 
    PaymentStatus, 
    Wallet, 
    Company} from "../models";
import { boletoGenerator } from "../helpers";
import { LoggerInstance } from "ts-framework-common";

export interface PaymentServiceOptions {
    logger: LoggerInstance;
}

export default class PaymentService {

    private logger: LoggerInstance;
    private static ROOT_ASSET = "BRLD";
    private static instance: PaymentService;

    private paymentRepository: Repository<Payment>;
    private boletoRepository: Repository<Boleto>;

    private bitcapitalClient: Bitcapital;

    constructor(options: PaymentServiceOptions) {
        this.logger = options.logger;
        this.bitcapitalClient = BitCapital.getInstance().getClient();
        this.paymentRepository = getRepository(Payment); 
        this.boletoRepository = getRepository(Boleto);
    }

    public static initialize(options: PaymentServiceOptions) {
        if(!PaymentService.instance) {
            PaymentService.instance = new PaymentService(options);
        }
        return PaymentService.instance;
    }

    public static getInstance() {
        if(!PaymentService.instance) {
            throw new Error("PaymentService instance not initialized!");
        }
        return PaymentService.instance;
    }

    public async internalPayment(recipient: Person, amount: string): Promise<Payment> {
        const accountable = await DomainService.getInstance()
        .findAccountable(recipient.sender.id);
        const type = recipient.type == PersonType.EMPLOYEE? 
        PaymentType.EMPLOYEE_PAYMENT:PaymentType.SUPPLIER_PAYMENT;

        return await this.payment(accountable, recipient, amount, type);
    }

    public async payment(
        sender: Person, 
        recipient: Person, 
        amount: string, 
        type?: PaymentType): Promise<Payment> {
        
        const personService = PersonService.getInstance();

        sender = await personService.findById(sender.id);
        recipient = await personService.findById(recipient.id);

        let payment: Payment;
        try {
            // TODO check account and wallet status before continue
            const senderWallet = await this.bitcapitalClient
            .wallets().findOne(sender.wallet.externalId);
            const walletBalance = senderWallet.balances.find(wallet => 
                wallet.asset_code == PaymentService.ROOT_ASSET);

            if(!walletBalance.balance || walletBalance.balance < parseFloat(amount))
                throw new HttpError("Payment failed due to lack of funds", 
                HttpCode.Client.BAD_REQUEST);

            const remotePayment = await this.bitcapitalClient.payments().pay({
                source: sender.wallet.externalId,
                recipients: [{
                    amount: amount,
                    destination: recipient.wallet.externalId
                }]
            });

            payment = new Payment({
                type: type || PaymentType.TRANSFER,
                externalId: remotePayment.id,
                sender: sender.wallet,
                recipient: recipient.wallet,
                amount: amount,
            });
            await this.paymentRepository.save(payment);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error executing payment: ${message}`, payment && payment.toJSON(), error);
            throw error;
        }

        return payment;
    }

    public async deposit(amount: string, domain: Company | string, recipient?: Person): 
    Promise<Payment> {
        let payment: Payment;
        try {
            const accountable = await DomainService.getInstance()
            .findAccountable(typeof domain === 'string'? domain:domain.id);

            const remotePayment = await this.bitcapitalClient.assets().emit({ 
                id: PaymentService.ROOT_ASSET,  
                amount: parseFloat(amount).toFixed(6)
            });

            payment = new Payment({
                type: PaymentType.DEPOSIT,
                externalId: remotePayment.id,
                sender: accountable.wallet,
                recipient: accountable.wallet,
                amount: parseFloat(amount).toFixed(6)
            });
            payment = await this.paymentRepository.save(payment);

            if(recipient && recipient.id != accountable.id) {
                payment = await this.payment(
                    accountable, 
                    recipient, 
                    amount, 
                    PaymentType.DEPOSIT);
            }

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error trying to deposit into mediator account: ${message}`, payment && payment.toJSON(), error);
            throw error;
        }

        return payment;
    }

    public async getBlockchainTransactions(
        wallet: Wallet | string, 
        offset: number,
        limit: number): Promise<PaginatedArray<Transaction>> {

        let transactions: PaginatedArray<Transaction>;
        try { 
            let remoteWalletId; 
            if(typeof wallet === 'string') { 
                const localWallet = await getRepository(Wallet)
                .findOneOrFail({ where: { id: wallet } });
                remoteWalletId = localWallet.externalId;
            } else {
                remoteWalletId = wallet.externalId;
            }

            await this.bitcapitalClient
                .wallets()
                .findWalletTransactions(
                    remoteWalletId, 
                    { limit: limit, skip: offset }
                );
        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error retrieving transactions of wallet: ${typeof wallet === 'string'? wallet:wallet.id}`, error);
            throw error;
        }

        return transactions;
    }

    public async emitBankSlip(
        domainId: string, 
        expiresAt: Date, 
        amount: string,
        recipient?: Person): Promise<Boleto> {
        
        const domainService = DomainService.getInstance();
        const domain = await domainService.findById(domainId);

        let boleto: Boleto;
        try {
            recipient = recipient? 
            await PersonService.getInstance().findById(recipient.id):
            await domainService.findAccountable(domainId);

            const session = this.bitcapitalClient.session();
            const boletoService = new ExtendedPaymentWebService({
                session: session,
                client: session.options.http.client,
                clientId: session.options.http.clientId,
                clientSecret: session.options.http.clientSecret,
                baseURL: session.options.http.baseURL,
                data: session.options.http.data,
                headers: session.options.http.headers,
            });

            const remote = await boletoService.issueBankSlip({
                amount: amount,
                expiresAt: expiresAt
            });

            boleto = new Boleto({
                externalId: remote.id,
                recipient: recipient.wallet,
                expiresAt: expiresAt,
                amount: parseFloat(amount).toFixed(2)
            });
            boleto = await this.boletoRepository.save(boleto);

            const generated = await boletoGenerator(domain, boleto);
            boleto.digitableLine = (generated['linha_digitavel'] as string).replace(/\D/g, "");
            boleto.barcode = generated['barcode_data'];
            await this.boletoRepository.save(boleto);

        } catch(error) {
            console.dir(error);
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error trying to issue bank slip: ${message}`, boleto && boleto.toJSON(), error);
            throw error;
        }

        return boleto;
    }

    public async registerBankSlip(id: string): Promise<Boleto> {
        
        let boleto: Boleto = await this.findBoletoById(id);
        if(!boleto)
            throw new HttpError(`There is no boleto with the given id ${id}`,
            HttpCode.Client.NOT_FOUND);

        try {
            const session = this.bitcapitalClient.session();
            const boletoService = new ExtendedPaymentWebService({
                session: session,
                client: session.options.http.client,
                clientId: session.options.http.clientId,
                clientSecret: session.options.http.clientSecret,
                baseURL: session.options.http.baseURL,
                data: session.options.http.data,
                headers: session.options.http.headers,
            });
            const remote = await boletoService.registerBankSlip(id);

            boleto.registered = true;
            await this.boletoRepository.save(boleto);

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger
            .error(`Error registering bank slip: ${message}`, boleto && boleto.toJSON(), error);
            throw error;
        }

        return boleto;
    }

    /**
     * TODO criar schema e testar 
     * @param recipient 
     * @param bankingId 
     * @param amount 
     * @param description 
     */
    public async withdraw(
        recipient: Person, 
        bankingId: string, 
        amount: string, 
        description: string): Promise<string> {

        recipient = await PersonService.getInstance().findById(recipient.id);
        let result: string;
        try {
            const recipientWallet = await this.bitcapitalClient
            .wallets().findOne(recipient.wallet.externalId);
            const walletBalance = recipientWallet.balances.find(wallet => 
                wallet.asset_code == PaymentService.ROOT_ASSET);

            if(!walletBalance.balance || walletBalance.balance < parseFloat(amount)) {
                throw new HttpError("Payment failed due to lack of funds", 
                HttpCode.Client.BAD_REQUEST);
            }

            const bankAccount = recipient.bankAccount
            .find(bankAccount => bankAccount.id == bankingId);
            if(!bankAccount) {
                throw new HttpError("There is no bank account with the given id", 
                HttpCode.Client.NOT_FOUND);
            }
            const remoteBankingId = bankAccount.externalId;
            
            const session = this.bitcapitalClient.session();
            const paymentAPIClient = new ExtendedPaymentWebService({
                session: session,
                client: session.options.http.client,
                clientId: session.options.http.clientId,
                clientSecret: session.options.http.clientSecret,
                baseURL: session.options.http.baseURL,
                data: session.options.http.data,
                headers: session.options.http.headers,
            });

            result = await paymentAPIClient
            .withdraw({
                bankingId: remoteBankingId,
                amount: parseFloat(amount),
                description: description
            });

        } catch(error) {
            const message = error.message || error.data && error.data.message;
            this.logger.error(`Error executing withdraw: ${message}`, error);
            throw error;
        }

        return result;
    }

    public async create(payment: Payment): Promise<Payment> {
        return await this.paymentRepository.save(payment);
    }

    public async findPaymentById(id: string): Promise<Payment> {
        return await this.paymentRepository
        .findOne({
            where: { id: id },
            relations: ["sender", "recipient"]
        });
    }

    public async findPaymentByStatus(
        status: PaymentStatus, 
        offset?: number, 
        limit?: number): Promise<[Payment[], number]> {

        return await this.paymentRepository
        .findAndCount({ 
            where: { status: status },
            relations: ["sender", "recipient"],
            skip: offset,
            take: limit,
            order: { createdAt: "ASC" } 
        });
    }

    public async findPaymentByType(
        type: PaymentType, 
        offset?: number, 
        limit?: number): Promise<[Payment[], number]> {

        return await this.paymentRepository
        .findAndCount({ 
            where: { type: type },
            relations: ["sender", "recipient"],
            skip: offset,
            take: limit,
            order: { createdAt: "ASC" } 
        });
    }

    public async findPaymentByPeriod(
        wallet: Wallet | string,
        filters: any = {}, 
        offset?: number, 
        limit?: number): Promise<[Payment[], number]> {

        const walletId = typeof wallet === 'string'? wallet:wallet.id;

        let qb = this.paymentRepository
        .createQueryBuilder("payment")
        .innerJoinAndSelect("payment.sender", "sender")
        .innerJoinAndSelect("payment.recipient", "recipient")
        .where(new Brackets(innerQB => {
            innerQB
            .where("recipient.id = :id", { id: walletId })
            .orWhere("sender.id  = :id", { id: walletId })
        }));

        if(filters.after && filters.before) {
            qb = qb.andWhere("created_at BETWEEN :after AND :before", 
                            { after: filters.after, before: filters.before });
        } else if(filters.after) {
            qb = qb.andWhere("created_at >= :date", { date: filters.after });
        } else if(filters.before) {
            qb = qb.andWhere("created_at <= :date", { date: filters.before });
        }
            
        return await qb
            .offset(offset)
            .limit(limit)
            .orderBy("created_at", "ASC")
            .getManyAndCount();
    }

    public async findBoletoById(id: string): Promise<Boleto> {
        return await this.boletoRepository
        .findOne({ 
            where: { id: id },
            relations: ["recipient"] 
        });
    }

    public async findBoletoByCode(code: string): Promise<Boleto> {
        return await this.boletoRepository
        .createQueryBuilder("boleto")
        .innerJoinAndSelect("boleto.recipient", "recipient")
        .where("boleto.digitableLine = :digitableLine", { digitableLine: code })
        .orWhere("boleto.barcode = :barcode", { barcode: code })
        .getOne();
    }

    public async findBoletoByStatus(
        status: BoletoStatus, 
        offset?: number, 
        limit?: number): Promise<[Boleto[], number]> {

        return await this.boletoRepository
        .findAndCount({ 
            where: { status: status },
            relations: ["recipient"],
            skip: offset,
            take: limit,
            order: { createdAt: "ASC" } 
        });
    }

    public async findBoletoByRecipient(
        recipient: string, 
        offset?: number, 
        limit?: number): Promise<[Boleto[], number]> {
        
        return await this.boletoRepository
        .createQueryBuilder("boleto")
        .innerJoinAndSelect("boleto.recipient", "recipient")
        .where("recipient.id = :recipient", { recipient: recipient })
        .offset(offset)
        .limit(limit)
        .orderBy("createdAt", "ASC")
        .getManyAndCount();
    }

    public async findBoletoByIssuingPeriod(
        filters: any = {}, 
        offset?: number, 
        limit?: number): Promise<[Boleto[], number]> {
    
        let qb = this.boletoRepository
        .createQueryBuilder("boleto")
        .innerJoinAndSelect("boleto.recipient", "recipient")
        
        if(filters.after) {
            qb = qb.andWhere("createdAt >= :after", { after: filters.after });
        }

        if(filters.before) {
            qb = qb.andWhere("createdAt <= :before", { before: filters.before });
        }
        
        return await qb
            .offset(offset)
            .limit(limit)
            .orderBy("createdAt", "ASC")
            .getManyAndCount();
    }

}