
import { LightningElement, wire } from 'lwc';

import getDashboardMetrics
    from '@salesforce/apex/InventoryDashboardService.getDashboardMetrics';

import { refreshApex } from '@salesforce/apex';

import { ShowToastEvent }
    from 'lightning/platformShowToastEvent';


export default class InventoryAllocationDashboard extends LightningElement {

    metrics;
    wiredMetricsResult;

    isLoading = false;


    // Retrieve dashboard metrics
    @wire(getDashboardMetrics)
    wiredMetrics(result) {

        this.wiredMetricsResult = result;

        if (result.data) {

            this.metrics = result.data;

        } else if (result.error) {

            this.showToast(
                'Error',
                this.getErrorMessage(result.error),
                'error'
            );
        }
    }


    // Refresh dashboard metrics
    async handleRefresh() {

        if (!this.wiredMetricsResult) {
            return;
        }

        this.isLoading = true;

        try {

            await refreshApex(this.wiredMetricsResult);

            this.showToast(
                'Success',
                'Dashboard metrics refreshed successfully.',
                'success'
            );

        } catch (error) {

            this.showToast(
                'Error',
                this.getErrorMessage(error),
                'error'
            );

        } finally {

            this.isLoading = false;
        }
    }


    // Extract error message
    getErrorMessage(error) {

        return error?.body?.message ||
               error?.message ||
               'An unexpected error occurred.';
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
