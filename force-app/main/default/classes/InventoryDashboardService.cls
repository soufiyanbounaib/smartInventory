
public with sharing class InventoryDashboardService {

    public class DashboardMetrics {
        @AuraEnabled public Integer activeInventoryItems { get; set; }
        @AuraEnabled public Integer activeWarehouses { get; set; }
        @AuraEnabled public Integer submittedRequests { get; set; }

        @AuraEnabled public Decimal totalOnHand { get; set; }
        @AuraEnabled public Decimal totalReserved { get; set; }
        @AuraEnabled public Decimal totalAvailable { get; set; }
    }

    @AuraEnabled(cacheable=true)
    public static DashboardMetrics getDashboardMetrics() {

        DashboardMetrics metrics = new DashboardMetrics();

        metrics.activeInventoryItems = [
            SELECT COUNT()
            FROM Inventory_Item__c
            WHERE Active__c = true
        ];

        metrics.activeWarehouses = [
            SELECT COUNT()
            FROM Warehouse__c
            WHERE Active__c = true
        ];

        metrics.submittedRequests = [
            SELECT COUNT()
            FROM Allocation_Request__c
            WHERE Status__c = 'Submitted'
        ];

        AggregateResult[] stockSummary = [
            SELECT
                SUM(Quantity_On_Hand__c) totalOnHand,
                SUM(Quantity_Reserved__c) totalReserved
            FROM Stock_Level__c
        ];

        Decimal onHand =
            (Decimal) stockSummary[0].get('totalOnHand');

        Decimal reserved =
            (Decimal) stockSummary[0].get('totalReserved');

        metrics.totalOnHand = onHand == null ? 0 : onHand;
        metrics.totalReserved = reserved == null ? 0 : reserved;

        metrics.totalAvailable =
            metrics.totalOnHand - metrics.totalReserved;

        return metrics;
    }
}
