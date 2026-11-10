import { LightningElement, wire } from 'lwc';

import loadAllocationRequests
    from '@salesforce/apex/AllocationRequestService.LoadAllocationRequests';

import loadAllocationLines
    from '@salesforce/apex/AllocationRequestService.LoadAllocationLines';

import { refreshApex } from '@salesforce/apex';

import { updateRecord, deleteRecord }
    from 'lightning/uiRecordApi';

import LightningConfirm from 'lightning/confirm';

import { ShowToastEvent }
    from 'lightning/platformShowToastEvent';


export default class AllocationRequestManager extends LightningElement {

    requests = [];
    allocationLines = [];

    selectedRequestId;
    selectedRequestName;

    requestDraftValues = [];
    lineDraftValues = [];

    wiredRequestsResult;
    wiredLinesResult;

    // Allocation Request columns
    requestColumns = [
        { label: 'Request Number', fieldName: 'Name' },
        { label: 'Requesting Team', fieldName: 'Requesting_Team__c' },
        { label: 'Priority', fieldName: 'Priority__c' },
        { label: 'Status', fieldName: 'Status__c', editable: true },
        {
            label: 'Created Date',
            fieldName: 'CreatedDate',
            type: 'date'
        },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Manage Lines', name: 'manage_lines' },
                    { label: 'Delete', name: 'delete' }
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
            type: 'number',
            editable: true
        },
        {
            label: 'Quantity Approved',
            fieldName: 'Quantity_Approved__c',
            type: 'number',
            editable: true
        },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Delete', name: 'delete' }
                ]
            }
        }
    ];


    // Retrieve Allocation Requests
    @wire(loadAllocationRequests)
    wiredRequests(result) {

        this.wiredRequestsResult = result;

        if (result.data) {
            this.requests = result.data;
        } else if (result.error) {
            this.showToast(
                'Error',
                'Unable to load allocation requests.',
                'error'
            );
        }
    }


    // Retrieve lines for the selected request
    @wire(loadAllocationLines, { requestId: '$selectedRequestId' })
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
                'Unable to load allocation lines.',
                'error'
            );
        }
    }


    // Create Allocation Request
    async handleRequestSuccess() {

        this.showToast(
            'Success',
            'Allocation request created successfully.',
            'success'
        );

        await refreshApex(this.wiredRequestsResult);
    }


    // Request row actions
    async handleRequestRowAction(event) {

        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'manage_lines') {

            this.selectedRequestId = row.Id;
            this.selectedRequestName = row.Name;

        } else if (actionName === 'delete') {

            const confirmed = await LightningConfirm.open({
                message: 'Are you sure you want to delete this request?',
                label: 'Confirm Deletion',
                theme: 'warning'
            });

            if (confirmed) {
                try {
                    await deleteRecord(row.Id);

                    if (this.selectedRequestId === row.Id) {
                        this.selectedRequestId = null;
                        this.selectedRequestName = null;
                    }

                    await refreshApex(this.wiredRequestsResult);

                    this.showToast(
                        'Success',
                        'Allocation request deleted successfully.',
                        'success'
                    );

                } catch (error) {
                    this.handleError(error);
                }
            }
        }
    }


    // Edit Allocation Request
    async handleRequestSave(event) {

        const records = event.detail.draftValues;

        const recordInputs = records.map(record => ({
            fields: { ...record }
        }));

        try {
            await Promise.all(
                recordInputs.map(record => updateRecord(record))
            );

            this.requestDraftValues = [];

            await refreshApex(this.wiredRequestsResult);

            this.showToast(
                'Success',
                'Allocation requests updated successfully.',
                'success'
            );

        } catch (error) {
            this.handleError(error);
        }
    }


    // Set the parent Allocation Request before creating a line
    handleLineSubmit(event) {

        event.preventDefault();

        const fields = event.detail.fields;

        fields.Allocation_Request__c = this.selectedRequestId;

        event.target.submit(fields);
    }


    // Allocation Line successfully created
    async handleLineSuccess() {

        this.showToast(
            'Success',
            'Allocation line created successfully.',
            'success'
        );

        await refreshApex(this.wiredLinesResult);
    }


    // Edit Allocation Lines
    async handleLineSave(event) {

        const records = event.detail.draftValues;

        const recordInputs = records.map(record => ({
            fields: { ...record }
        }));

        try {
            await Promise.all(
                recordInputs.map(record => updateRecord(record))
            );

            this.lineDraftValues = [];

            await refreshApex(this.wiredLinesResult);

            this.showToast(
                'Success',
                'Allocation lines updated successfully.',
                'success'
            );

        } catch (error) {
            this.handleError(error);
        }
    }


    // Delete Allocation Line
    async handleLineRowAction(event) {

        const row = event.detail.row;

        if (event.detail.action.name === 'delete') {

            const confirmed = await LightningConfirm.open({
                message: 'Are you sure you want to delete this allocation line?',
                label: 'Confirm Deletion',
                theme: 'warning'
            });

            if (confirmed) {
                try {
                    await deleteRecord(row.Id);

                    await refreshApex(this.wiredLinesResult);

                    this.showToast(
                        'Success',
                        'Allocation line deleted successfully.',
                        'success'
                    );

                } catch (error) {
                    this.handleError(error);
                }
            }
        }
    }


    // General error handler
    handleError(event) {

        const message = event?.detail?.message ||
                        event?.body?.message ||
                        'An unexpected error occurred.';

        this.showToast('Error', message, 'error');
    }


    // Toast notification
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