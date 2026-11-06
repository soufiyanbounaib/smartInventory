import { LightningElement ,wire} from 'lwc';
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import getWarehouses from '@salesforce/apex/WarehouseService.getWarehouses';
import {refreshApex} from '@salesforce/apex';
import { updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import LightningConfirm from 'lightning/confirm';
const COLUMNS=[
   {label:'Name',fieldName:'Name', type: 'text',editable: true },
   { label: 'Location', fieldName: 'Location__c', type: 'text' , editable: true },
   { label: 'Active', fieldName: 'Active__c', type: 'boolean' },
   {
    type: 'action',
    typeAttributes: {
        rowActions: [
            { label: 'Delete', name: 'delete' }
        ]
    }
  }
];
export default class WarehouseManager extends LightningElement {

        wiredWarehousesResult;
        warehouses;
        error;
        colums=COLUMNS;
        draftValues = [];
        @wire(getWarehouses)
        wiredWarehouses(result)
        {
            this.wiredWarehousesResult=result;
            const { data, error } = result;
            if(data)
            {
            this.warehouses = data;
            this.error = undefined;
          } else if(error){
            this.warehouses = undefined;
            this.error = error;
         }
        }
        handleSuccess(event)
        {
           this.dispatchEvent(
           new ShowToastEvent({
           title: 'Success',
           message: 'Warehouse has been created successfully!',
           variant: 'success'
        })
        
          );  
           refreshApex(this.wiredWarehousesResult);
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
                    message: 'Warehouse has been updated successfully!',
                    variant: 'success'
                })
            );

            this.draftValues = [];

            await refreshApex(this.wiredWarehousesResult);

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

     handleRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;

    if (actionName === 'delete') {
        this.deleteWarehouse(row.Id);
     }
    }    
    
    async deleteWarehouse(recordId) {

        const result = await LightningConfirm.open({
            message: 'This is the confirm message',
            label: 'Confirm deletion?',
            theme: 'warning',
        });
        if(!result)
     { 
        return;
     }
    try {
        await deleteRecord(recordId);

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Inventory item deleted successfully!',
                variant: 'success'
            })
        );

        await refreshApex(this.wiredWarehousesResult);

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