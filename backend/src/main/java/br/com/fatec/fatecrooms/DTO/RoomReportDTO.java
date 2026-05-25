package br.com.fatec.fatecrooms.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RoomReportDTO {
    private Integer roomId;
    private String  name;
    private String  location;

    // ── Reservas avulsas ────────────────────────────────────
    private long totalBookings;
    private long approvedBookings;
    private long pendingBookings;
    private long cancelledBookings;
    private long rejectedBookings;

    // ── Reservas recorrentes (instâncias) ───────────────────
    private long recurringTotalInstances;
    private long recurringActiveInstances;
    private long recurringCancelledInstances;
    private long recurringSkippedInstances;

    // ── Combinado (avulsas aprovadas + instâncias ativas) ───
    private long combinedOccupations;
}
