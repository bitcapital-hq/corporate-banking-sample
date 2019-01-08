import { Company, Boleto } from "../models";
import { DomainService } from "../services";

const PagarmeBoleto = require('node-boleto').Boleto;

export async function boletoGenerator(domain: Company, boletoData: Boleto) {

  const accountable = await DomainService.getInstance()
  .findAccountable(domain.id);
  const bankAccount = accountable.bankAccount.find(account => account.default);

  if(!bankAccount || !bankAccount.collectionWallet) {
    throw new Error("Bank account not found or does not contain the required data to generate the bank slip");
  }

  return new PagarmeBoleto({
    'banco': "santander", 
    'data_emissao': boletoData.createdAt,
    'data_vencimento': boletoData.expiresAt, 
    'valor':  parseInt(parseFloat(boletoData.amount).toFixed(2)) * 100,
    'nosso_numero': boletoData.sequential.toString().padStart(10, "0"),
    'numero_documento': boletoData.sequential.toString().padStart(10, "0"),
    'cedente': domain.name,
    'cedente_cnpj': domain.ein,
    'agencia': `${bankAccount.branch}${bankAccount.branchDigit}`,
    'codigo_cedente': `${bankAccount.collectionWallet}${bankAccount.branch}${bankAccount.number}`,
    'carteira': bankAccount.collectionWallet
  });
}
