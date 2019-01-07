import { PaymentWebServiceOptions } from "../../node_modules/bitcapital-core-sdk/dist/types/services/PaymentWebService";
import { 
    PaymentWebService, 
    RequestUtil, 
    Transaction, 
    Recipient, 
    BaseModel } from "bitcapital-core-sdk";

export interface BoletoRequestSchema {
    amount: string;
    expiresAt: Date;
}

export class BoletoModel extends BaseModel {
    transaction: Transaction;
    recipients: Recipient[];
    amount?: number;

    constructor(data: Partial<BoletoModel> = {}) {
        super(data);
        Object.assign(this, data);
    }
}

export default class BoletoWebService extends PaymentWebService {
    
    constructor(options: PaymentWebServiceOptions) {
        super(options);
    }

    public async emit(request: BoletoRequestSchema): Promise<BoletoModel> {
        const { amount, expiresAt } = request;
    
        const url = `/payments/boleto`;
        const body = { amount, expiresAt };
        const signature = RequestUtil.sign(this.options.clientSecret, {
          url,
          method: "POST",
          body: JSON.stringify(body)
        });
    
        const response = await this.http.post(url, body, { headers: { ...signature } });
    
        if (!response || response.status !== 200) {
          throw response;
        }
    
        return new BoletoModel(response.data);
      }

      public async register(id: string): Promise<BoletoModel> {
    
        const url = `/payments/boleto/register/${id}`;
        const signature = RequestUtil.sign(this.options.clientSecret, {
          url,
          method: "POST"
        });
    
        const response = await this.http.post(url, { headers: { ...signature } });
    
        if (!response || response.status !== 200) {
          throw response;
        }
    
        return new BoletoModel(response.data);
      }

      public async findById(id: string): Promise<BoletoModel> {
        const response = await this.http.get(`/payments/boleto/${id}`);
    
        if (!response || response.status !== 200) {
          throw response;
        }
    
        return new BoletoModel(response.data);
      }
}
