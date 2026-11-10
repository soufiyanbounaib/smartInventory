public with sharing class AllocationRequestService {

    @AuraEnabled(cacheable=true)
    public static List<Allocation_Request__c> LoadAllocationRequests() {
        return [
            SELECT Id, Name, Requesting_Team__c,
                   Priority__c, Status__c, CreatedDate
            FROM Allocation_Request__c
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Allocation_Line__c> LoadAllocationLines(Id requestId) {
        if (requestId == null) {
            return new List<Allocation_Line__c>();
        }

        return [
            SELECT Id, Name, Inventory_Item__c,
                   Inventory_Item__r.Name,
                   Quantity_Requested__c,
                   Quantity_Approved__c
            FROM Allocation_Line__c
            WHERE Allocation_Request__c = :requestId
            ORDER BY CreatedDate DESC
        ];
    }
}