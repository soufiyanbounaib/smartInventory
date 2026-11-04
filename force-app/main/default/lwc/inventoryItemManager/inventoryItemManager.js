import { LightningElement,wire } from 'lwc';
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import loadInventoryItem from '@salesforce/apex/InventoryService.LoadInventoryItem';
import {refreshApex} from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
const COLUMNS=[
   {label:'Name',fieldName:'Name', type: 'text',editable: true },
   { label: 'SKU', fieldName: 'SKU__c', type: 'text' },
   { label: 'Category', fieldName: 'Category__c', type: 'text' ,editable: true },
   { label: 'Unit Cost', fieldName: 'Unit_Cost__c', type: 'currency' ,editable: true },
   { label: 'Active', fieldName: 'Active__c', type: 'boolean' }
];
export default class InventoryItemManager extends LightningElement {
    wiredInventoryItemsResult;
    inventoryItems;
    error;
    colums=COLUMNS;
    draftValues = [];
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
    get errorMessage() {
    return this.error?.body?.message || this.error?.message;
   }

     async handleSave(event) {
        const updatedFields = event.detail.draftValues;
        const recordUpdates = updatedFields.map(record => ({
            fields: { ...record }
        }));

        try {
            await Promise.all(
                recordUpdates.map(record => updateRecord(record))
            );

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Inventory items updated successfully!',
                    variant: 'success'
                })
            );

            this.draftValues = [];

            await refreshApex(this.wiredInventoryItemsResult);

        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || error.message,
                    variant: 'error'
                })
            );
        }
    }
}