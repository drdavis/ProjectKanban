import {and,eq} from 'drizzle-orm';
import type {database} from './db';
import {products,productMembers} from './schema';
import {RequestError} from './card-write';
export type Transaction=Parameters<Parameters<ReturnType<typeof database>['transaction']>[0]>[0];
export async function productAccess(tx:Transaction,productId:string,userId:string,write=false){
 const [product]=await tx.select().from(products).where(eq(products.id,productId)).for(write?'update':'share');
 if(!product)throw new RequestError('Product not found.',404);
 const [member]=product.owner===userId?[]:await tx.select().from(productMembers).where(and(eq(productMembers.productId,productId),eq(productMembers.userId,userId)));
 const role=product.owner===userId?'owner':member?.role;
 if(!role)throw new RequestError('Product not found.',404);
 return {product,role};
}
export async function memberIds(tx:Transaction,productId:string,owner:string){
 const members=await tx.select().from(productMembers).where(eq(productMembers.productId,productId));
 return new Set([owner,...members.map(m=>m.userId)]);
}
