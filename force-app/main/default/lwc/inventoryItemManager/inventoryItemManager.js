import { LightningElement,wire } from 'lwc';
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import loadInventoryItem from '@salesforce/apex/InventoryService.LoadInventoryItem';
import {refreshApex} from '@salesforce/apex';

export default class InventoryItemManager extends LightningElement {
    wiredInventoryItemsResult;
    inventoryItems;
    @wire(loadInventoryItem)
    wiredInventoryItems(result)
    {
        this.wiredInventoryItemsResult=result;
        const { data, error } = result;
        if(data)
        {
         this.inventoryItems = data;
        this.error = undefined;
      } else if(error){
        this.inventoryItems = undefined;
        this.error = error;
     }
    }
    handleSuccess(event)
    {
       this.dispatchEvent(
       new ShowToastEvent({
       title: 'Success',
       message: 'Inventory item created successfully!',
       variant: 'success'
    })
    
      );  
       refreshApex(this.wiredInventoryItemsResult);
    }
    handleError(event)
    {
           this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: event.detail.message,
            variant: 'error'
        })
    );

    }
}