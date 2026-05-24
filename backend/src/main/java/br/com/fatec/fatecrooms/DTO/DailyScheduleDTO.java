package br.com.fatec.fatecrooms.DTO;

import br.com.fatec.fatecrooms.model.Booking;
import br.com.fatec.fatecrooms.model.RecurringBookingInstance;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Snapshot do dia para a tela de planilha do coordenador.
 * Retorna todas as salas com seus períodos e o que está ocupando cada slot.
 */
@Getter
@AllArgsConstructor
public class DailyScheduleDTO {

    private LocalDate date;
    private List<RoomSchedule> rooms;

    @Getter
    @AllArgsConstructor
    public static class RoomSchedule {
        private Integer roomId;
        private String  roomName;
        private String  roomLocation;
        private List<PeriodSlot> slots;
    }

    @Getter
    @AllArgsConstructor
    public static class PeriodSlot {
        private Integer   periodId;
        private String    periodName;
        private LocalTime startTime;
        private LocalTime endTime;
        private SlotStatus status;   // FREE, BOOKED, RECURRING, HOLIDAY
        private SlotOccupant occupant; // null se livre
    }

    @Getter
    @AllArgsConstructor
    public static class SlotOccupant {
        private String  type;          // "BOOKING" ou "RECURRING"
        private Integer id;
        private String  subject;
        private String  userOrClass;   // nome do professor ou label da turma
        private Booking.Status bookingStatus;             // só para BOOKING
        private RecurringBookingInstance.Status recurringStatus; // só para RECURRING
    }

    public enum SlotStatus {
        FREE, BOOKED, RECURRING, HOLIDAY
    }
}