package com.example.RobotServerMini.DTO;


import java.util.List;
public class MissionDTO {
    private String capacityResourceId;
    private String capacityResourceObjectId;
    private String siteId;
    private List<DestinationDTO> destinations;

    // Getter & Setter
    public String getCapacityResourceId() { return capacityResourceId; }
    public void setCapacityResourceId(String capacityResourceId) { this.capacityResourceId = capacityResourceId; }

    public String getCapacityResourceObjectId() { return capacityResourceObjectId; }
    public void setCapacityResourceObjectId(String capacityResourceObjectId) { this.capacityResourceObjectId = capacityResourceObjectId; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public List<DestinationDTO> getDestinations() { return destinations; }
    public void setDestinations(List<DestinationDTO> destinations) { this.destinations = destinations; }
}
