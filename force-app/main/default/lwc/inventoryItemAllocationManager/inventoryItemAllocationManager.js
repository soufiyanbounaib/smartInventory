
import { LightningElement, wire } from 'lwc';

import loadAllocationRequests
    from '@salesforce/apex/AllocationRequestService.LoadAllocationRequests';

import loadAllocationLines
    from '@salesforce/apex/AllocationRequestService.LoadAllocationLines';

import allocateRequest
    from '@salesforce/apex/InventoryAllocationService.allocateRequest';

import { refreshApex } from '@salesforce/apex';

import { ShowToastEvent }
    from 'lightning/platformShowToastEvent';


export default class InventoryItemAllocationManager extends LightningElement {

    requests = [];
    allocationLines = [];

    selectedRequestId;
    selectedRequestName;

    isProcessing = false;
    hasProcessed = false;

    wiredRequestsResult;
    wiredLinesResult;


    // Allocation Request columns
    requestColumns = [
        { label: 'Request Number', fieldName: 'Name' },
        { label: 'Requesting Team', fieldName: 'Requesting_Team__c' },
        { label: 'Priority', fieldName: 'Priority__c' },
        { label: 'Status', fieldName: 'Status__c' },
        {
            label: 'Created Date',
            fieldName: 'CreatedDate',
            type: 'date'
        },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'View Lines', name: 'view_lines' }
                ]
            }
        }
    ];


    // Allocation Line columns
    lineColumns = [
        { label: 'Line Number', fieldName: 'Name' },
        { label: 'Inventory Item', fieldName: 'InventoryItemName' },
        {
            label: 'Quantity Requested',
            fieldName: 'Quantity_Requested__c',
            type: 'number'
        },
        {
            label: 'Quantity Approved',
            fieldName: 'Quantity_Approved__c',
            type: 'number'
        }
    ];


    // Load submitted allocation requests
    @wire(loadAllocationRequests)
    wiredRequests(result) {

        this.wiredRequestsResult = result;

        if (result.data) {

            this.requests = result.data.filter(
                request => request.Status__c === 'Submitted'
            );

        } else if (result.error) {

            this.showToast(
                'Error',
                this.getErrorMessage(result.error),
                'error'
            );
        }
    }


    // Load allocation lines for selected request
    @wire(loadAllocationLines, {
        requestId: '$selectedRequestId'
    })
    wiredLines(result) {

        this.wiredLinesResult = result;

        if (result.data) {

            this.allocationLines = result.data.map(line => ({
                ...line,
                InventoryItemName: line.Inventory_Item__r?.Name
            }));

        } else if (result.error) {

            this.showToast(
                'Error',
                this.getErrorMessage(result.error),
                'error'
            );
        }
    }


    // Select a request and display its lines
    handleRequestRowAction(event) {

        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'view_lines') {

            this.selectedRequestId = row.Id;
            this.selectedRequestName = row.Name;

            this.hasProcessed = false;
        }
    }


    // Execute allocation
    async handleExecuteAllocation() {

        if (!this.selectedRequestId || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {

            await allocateRequest({
                allocationRequestId: this.selectedRequestId
            });

            this.hasProcessed = true;

            this.showToast(
                'Success',
                'Inventory allocation completed successfully.',
                'success'
            );

            await Promise.all([
                refreshApex(this.wiredRequestsResult),
                refreshApex(this.wiredLinesResult)
            ]);

        } catch (error) {

            this.showToast(
                'Allocation Failed',
                this.getErrorMessage(error),
                'error'
            );

        } finally {

            this.isProcessing = false;
        }
    }


    // Extract error message
    getErrorMessage(error) {

        return error?.body?.message ||
               error?.message ||
               'An unexpected error occurred.';
    }


    // Display toast notification
    showToast(title, message, variant) {

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}

