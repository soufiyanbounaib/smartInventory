import { LightningElement, wire } from 'lwc';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import loadStockLevels from '@salesforce/apex/StockLevelService.LoadStockLevels';

import { refreshApex } from '@salesforce/apex';

import {
    updateRecord,
    deleteRecord
} from 'lightning/uiRecordApi';

import LightningConfirm from 'lightning/confirm';


const COLUMNS = [

    {
        label: 'Inventory Item',
        fieldName: 'InventoryItemName',
        type: 'text'
    },

    {
        label: 'Warehouse',
        fieldName: 'WarehouseName',
        type: 'text'
    },

    {
        label: 'Quantity On Hand',
        fieldName: 'Quantity_on_Hand__c',
        type: 'number',
        editable: true
    },

    {
        label: 'Quantity Reserved',
        fieldName: 'Quantity_Reserved__c',
        type: 'number',
        editable: true
    },

    {
        label: 'Reorder Threshold',
        fieldName: 'Reorder_Threshold__c',
        type: 'number',
        editable: true
    },

    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                {
                    label: 'Delete',
                    name: 'delete'
                }
            ]
        }
    }

];


export default class StockLevelManager extends LightningElement {

    stockLevels;
    error;

    columns = COLUMNS;

    draftValues = [];

    wiredStockLevelsResult;


    // Retrieve Stock Levels

    @wire(loadStockLevels)
    wiredStockLevels(result) {

        this.wiredStockLevelsResult = result;

        const { data, error } = result;

        if (data) {

            this.stockLevels = data.map(level => ({

                ...level,

                InventoryItemName: level.Inventory_Item__r?.Name,

                WarehouseName: level.Warehouse__r?.Name

            }));

            this.error = undefined;

        } else if (error) {

            this.stockLevels = undefined;

            this.error = error;

        }

    }


    get errorMessage() {

        return this.error?.body?.message || this.error?.message;

    }


    // Create Stock Level

    async handleSuccess() {

        this.dispatchEvent(
            new ShowToastEvent({

                title: 'Success',

                message: 'Stock level created successfully!',

                variant: 'success'

            })
        );

        this.template.querySelectorAll('lightning-input-field')
            .forEach(field => field.reset());

        await refreshApex(this.wiredStockLevelsResult);

    }


    handleError(event) {

        this.dispatchEvent(
            new ShowToastEvent({

                title: 'Error',

                message: event.detail.message,

                variant: 'error'

            })
        );

    }


    // Update Stock Level

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

                    message: 'Stock levels updated successfully!',

                    variant: 'success'

                })
            );

            this.draftValues = [];

            await refreshApex(this.wiredStockLevelsResult);

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


    // Handle Row Actions

    handleRowAction(event) {

        const actionName = event.detail.action.name;

        const row = event.detail.row;

        if (actionName === 'delete') {

            this.deleteStockLevel(row.Id);

        }

    }


    // Delete Stock Level

    async deleteStockLevel(recordId) {

        const confirmed = await LightningConfirm.open({

            message: 'Are you sure you want to delete this stock level?',

            label: 'Confirm Deletion',

            theme: 'warning'

        });

        if (!confirmed) {

            return;

        }

        try {

            await deleteRecord(recordId);

            this.dispatchEvent(
                new ShowToastEvent({

                    title: 'Success',

                    message: 'Stock level deleted successfully!',

                    variant: 'success'

                })
            );

            await refreshApex(this.wiredStockLevelsResult);

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