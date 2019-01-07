import { PaymentWebServiceOptions } from "../../node_modules/bitcapital-core-sdk/dist/types/services/PaymentWebService";
import { 
    PaymentWebService, 
    RequestUtil, 
    Transaction, 
    Recipient, 
    BaseModel } from "bitcapital-core-sdk";

export interface WithdrawRequestSchema {
    bankingId: string;
    amount: number;
    description: string;
}

export class WithdrawModel extends BaseModel {
    transaction: Transaction;
    recipients: Recipient[];
    amount?: number;

    constructor(data: Partial<WithdrawModel> = {}) {
        super(data);
        Object.assign(this, data);
    }
}

export default class ExtendedPaymentWebService extends PaymentWebService {
    
    constructor(options: PaymentWebServiceOptions) {
        super(options);
    }

    public async withdraw(request: WithdrawRequestSchema): Promise<string> {
        const { bankingId, amount, description } = request;
    
        const url = `/payments/withdraw/${bankingId}`;
        const body = { amount, description };
        const signature = RequestUtil.sign(this.options.clientSecret, {
          url,
          method: "POST",
          body: JSON.stringify(body)
        });
    
        const response = await this.http.post(url, body, { headers: { ...signature } });
    
        if (!response || response.status !== 200) {
          throw response;
        }
    
        return response.data;
      }

}
