import { Controller, Get, BaseResponse, HttpCode, HttpError, Post } from 'ts-framework';
import { Person, Payment, Wallet, Company, Boleto } from '../models';
import { DomainService, PaymentService, PayrollService, PersonService } from '../services';
import { getRepository } from '../../node_modules/typeorm';
import TransactionMapper from '../integrations/bitcapital/mappers/TransactionMapper';
import { Auth } from '../filters';
import { ExtendedRequest } from "../types/http";
import { isUUID } from "../helpers";

@Controller('/')
export default class PaymentController {

  private static DEFAULT_LIMIT = 25;

  /**
   * GET person account payments
   * 
   * @description 
   */
  @Get('/payments', [Auth.authorize])
  static async accountStatement(req: ExtendedRequest, res: BaseResponse) {
    const { after = undefined, before = undefined, offset = 0, limit = PaymentController.DEFAULT_LIMIT }: 
          { after: Date; before: Date; offset: number; limit: number } = req.query;

    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    const filters = {
      before: before,
      after: after
    }

    let wallet = currentUser.wallet;
    if(!currentUser.wallet) {
      try {
        wallet = await getRepository(Wallet)
        .findOneOrFail({ 
          where: { owner: { id: currentUser.id } } 
        });
      } catch(error) {
        throw new HttpError("Wallet not found!", HttpCode.Client.NOT_FOUND);
      }
    }

    let payments: Payment[]; 
    let count: number;    
    try {
      [ payments, count ] = await PaymentService.getInstance()
      .findPaymentByPeriod(wallet, filters, offset, limit);
  
    } catch(error) {
      console.dir(error);
      if(error instanceof HttpError) throw error;
      throw new HttpError(`Error trying to retrieve payments of the given period: ${error.data.message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    res.set("X-Data-Length", count.toString());
    res.set("X-Data-Offset", req.query.offset || "0");
    res.set("X-Data-Limit",  req.query.limit  || PaymentController.DEFAULT_LIMIT);
    
    return res.success( payments.map(payment => payment.toJSON()) );
  }

  @Get('/wallets/:id/transactions', [Auth.authorize])
  static async findWalletTransactions(req: ExtendedRequest, res: BaseResponse) {
    const { id }: { id: string } = req.params;
    let   { offset = 0, limit = PaymentController.DEFAULT_LIMIT }: 
          { offset: number; limit: number } = req.query;

    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    const wallet = await getRepository(Wallet).findOne({ where: { id: id } });
    if(!wallet) 
      throw new HttpError(`There is no wallet with the given id: ${id}`, 
      HttpCode.Client.NOT_FOUND);

    let resultPage;
    try {
      resultPage = await PaymentService.getInstance()
      .getBlockchainTransactions(id, offset, limit);

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error trying to retrieve transactions: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    res.set("X-Data-Length", resultPage.length.toString());
    res.set("X-Data-Offset", req.query.offset || "0");
    res.set("X-Data-Limit",  req.query.limit  || PaymentController.DEFAULT_LIMIT);
    
    return res.success( resultPage.map(transaction => 
      TransactionMapper.toLocalTransactionSchema(transaction)) );
  }

  @Get('/payments/:id', [Auth.authorize])
  static async getPaymentDetails(req: ExtendedRequest, res: BaseResponse) {
    const { id }: { id: string } = req.params;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    const payment = await PaymentService.getInstance().findPaymentById(id);
    if(!payment) {
      throw new HttpError("There is no payment with the given identifier", 
      HttpCode.Client.NOT_FOUND);
    }

    const accountable = await DomainService.getInstance().findAccountable(currentUser.sender.id);
    if(![accountable.id, payment.sender.id, payment.recipient.id].includes(currentUser.id)) {
      throw new HttpError("The payment details can be accessed only by the sender, recipient or company's accountable", 
      HttpCode.Client.FORBIDDEN);
    }

    return res.success( payment.toJSON() );
  }

  @Post('/payments', [Auth.authorize])
  static async payment(req: ExtendedRequest, res: BaseResponse) {
    const { recipientId, amount }: { recipientId: string; amount: string } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    if(!recipientId || !amount) {
      throw new HttpError("The recipient ID and payment amount must be provided", 
      HttpCode.Client.BAD_REQUEST);
    }

    const recipient = await PersonService.getInstance().findById(recipientId);
    if(!recipient)
      throw new HttpError("There is no recipient with the given ID", 
      HttpCode.Client.BAD_REQUEST);

    let payment: Payment;
    try {
      payment = await PaymentService.getInstance()
      .payment(currentUser, recipient, amount);

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error performing payment: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    return res.success( payment.toJSON() );
  }

  @Post('/deposit', [Auth.authorize])
  static async deposit(req: ExtendedRequest, res: BaseResponse) {
    const { amount }: { amount: string } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    let payment: Payment;
    try {
      payment = await PaymentService.getInstance()
      .deposit(amount, domain.id, currentUser); 

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error trying to send funds to wallet: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    return res.success( payment.toJSON() );
  }

  @Post('/payments/withdraw/:bankingId', [Auth.authorize])
  static async withdraw(req: ExtendedRequest, res: BaseResponse) {
    const { bankingId }: { bankingId: string } = req.params;
    const { amount, description }: { amount: string; description: string } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    let result: string;
    try {
      result = await PaymentService.getInstance()
      .withdraw(currentUser, amount, bankingId, description);

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error trying to send funds to wallet: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    return res.success( result );
  }

  @Post('/boleto', [Auth.authorize])
  static async emitBankSlip(req: ExtendedRequest, res: BaseResponse) {
    const { amount, expiresAt }: { amount: string, expiresAt: Date } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
    
    let bankSlip: Boleto;
    try {
      bankSlip = await PaymentService.getInstance()
      .emitBankSlip(domain.id, expiresAt, amount, currentUser); 
  
    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error trying to issue bank slip: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }
    
    return res.success( bankSlip.toJSON() );
  }

  @Post('/boleto/:id/register', [Auth.authorize])
  static async registerBankSlip(req: ExtendedRequest, res: BaseResponse) {
    const { id }: { id: string } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
    
    const accountable = await DomainService.getInstance().findAccountable(domain.id);
    if(currentUser.id != accountable.id) {
        throw new HttpError("Only the company's accountable can do this", 
        HttpCode.Client.FORBIDDEN);
    }

    let bankSlip: Boleto;
    try {
      bankSlip = await PaymentService.getInstance().registerBankSlip(id); 
  
    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error trying to register bank slip: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }
    
    return res.success( bankSlip.toJSON() );
  }

  @Get('/boleto/:id', [Auth.authorize])
  static async findBankSlipById(req: ExtendedRequest, res: BaseResponse) {
    const { id }: { id: string } = req.params;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
    
    const paymentService = PaymentService.getInstance();
    let bankSlip: Boleto;
    try {
        bankSlip = isUUID(id)? 
          await paymentService.findBoletoById(id):
          await paymentService.findBoletoByCode(id);
  
    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error finding bank slip: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    if(!bankSlip) {
      throw new HttpError("There is no bank slip with the given identifier", 
      HttpCode.Client.NOT_FOUND);
    }
    
    return res.success( bankSlip.toJSON() );
  }

  @Post('/transfer', [Auth.authorize])
  static async transfer(req: ExtendedRequest, res: BaseResponse) {
    const { personId }: { personId: string } = req.params;
    const { recipientId, amount }: { recipientId: string; amount: string } = req.body;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    if(currentUser.id != personId) {
      throw new HttpError("Only the owner can execute a transfer from his account", 
      HttpCode.Client.FORBIDDEN);
    }

    if(!recipientId || !amount) {
      throw new HttpError("The recipient ID and payment amount must be provided", 
      HttpCode.Client.BAD_REQUEST);
    }

    const recipient = await PersonService.getInstance().findById(recipientId);
    if(!recipient)
      throw new HttpError("There is no recipient with the given ID", 
      HttpCode.Client.BAD_REQUEST);

    let payment: Payment;
    try {
      payment = await PaymentService.getInstance()
      .payment(currentUser, recipient, amount);

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error performing transfer: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    return res.success( payment.toJSON() );
  }

  @Post('/wages/:id', [Auth.authorize])
  static async payEmployee(req: ExtendedRequest, res: BaseResponse) {
    const { id }: { id: string } = req.params;
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];
    
    const recipient = await PersonService.getInstance().findById(id);
    if(!recipient) {
        throw new HttpError("There is no person with the given identifier", 
        HttpCode.Client.NOT_FOUND);
    }

    const accountable = await DomainService.getInstance().findAccountable(domain.id);
    if(currentUser.id != accountable.id) {
        throw new HttpError("Only the company's accountable can do this", 
        HttpCode.Client.FORBIDDEN);
    }

    let payment: Payment;
    try {
      const payments = await PayrollService.getInstance().payEmployees([recipient]);
      payment = payments.pop();

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error performing employee payment: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }
    
    return res.success( payment.toJSON() );
  }

  @Post('/wages', [Auth.authorize])
  static async payEmployees(req: ExtendedRequest, res: BaseResponse) {
    const [ domain, currentUser ] = [ req.core.domain as Company, req.user as Person ];

    const accountable = await domain.accountable.getPerson();
    if(currentUser.id != accountable.id) {
        throw new HttpError("Only the company's accountable can do this", 
        HttpCode.Client.FORBIDDEN);
    }

    let payments: Payment[];
    try {
      payments = await PayrollService.getInstance().payEmployees();

    } catch(error) {
      if(error instanceof HttpError) throw error;

      const message = error.message || error.data && error.data.message;
      throw new HttpError(`Error performing employees payment: ${message}`, 
      HttpCode.Server.INTERNAL_SERVER_ERROR);
    }

    return res.success( payments.map(payment => payment.toJSON()) );
  }
}
