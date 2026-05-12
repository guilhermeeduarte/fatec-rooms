package br.com.fatec.fatecrooms.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecurringBookingReportDTO {
    private Integer recurringBookingId;
    private String  roomName;
    private String  roomLocation;
    private String  semesterName;
    private String  classGroupLabel;
    private String  courseName;
    private String  subject;
    private String  status;          // ACTIVE | CANCELLED
    private int     totalInstances;
    private int     activeInstances;
    private int     cancelledInstances;
    private int     skippedInstances;
}
