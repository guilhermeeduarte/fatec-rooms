package br.com.fatec.fatecrooms.controller;

import br.com.fatec.fatecrooms.DTO.BookingDTO;
import br.com.fatec.fatecrooms.DTO.DailyScheduleDTO;
import br.com.fatec.fatecrooms.DTO.RecurringBookingDTO;
import br.com.fatec.fatecrooms.DTO.RecurringBookingInstanceDTO;
import br.com.fatec.fatecrooms.model.RecurringBooking;
import br.com.fatec.fatecrooms.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    //  TELA DE HORÁRIOS

    /**
     * GET /api/schedule/daily?date=2025-08-10
     * GET /api/schedule/daily?date=2025-08-10&roomId=1
     *
     * Snapshot do dia: todas as salas (ou uma sala) × todos os períodos,
     * mostrando o que está livre, ocupado por reserva simples ou recorrente.
     * Ideal para a planilha de horários do coordenador.
     */
    @GetMapping("/daily")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<DailyScheduleDTO> getDailySchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer roomId) {
        return ResponseEntity.ok(scheduleService.getDailySchedule(date, roomId));
    }

    //  FILTROS — Reservas simples


    /**
     * GET /api/schedule/bookings/by-room/{roomId}
     * Todas as reservas simples de uma sala (todos os status).
     */
    @GetMapping("/bookings/by-room/{roomId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<BookingDTO>> bookingsByRoom(@PathVariable Integer roomId) {
        return ResponseEntity.ok(scheduleService.listByRoom(roomId));
    }

    /**
     * GET /api/schedule/bookings/by-user/{userId}
     * Reservas simples de um usuário específico (visão do coordenador).
     */
    @GetMapping("/bookings/by-user/{userId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<BookingDTO>> bookingsByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(scheduleService.listByUser(userId));
    }

    // ─────────────────────────────────────────────
    //  FILTROS — Reservas Semestrais

    /**
     * GET /api/schedule/recurring/by-room/{roomId}
     * Reservas recorrentes de uma sala.
     */
    @GetMapping("/recurring/by-room/{roomId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<RecurringBookingDTO>> recurringByRoom(@PathVariable Integer roomId) {
        return ResponseEntity.ok(scheduleService.listRecurringByRoom(roomId));
    }

    /**
     * GET /api/schedule/recurring/by-class-group/{classGroupId}
     * Reservas recorrentes de uma turma.
     */
    @GetMapping("/recurring/by-class-group/{classGroupId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<RecurringBookingDTO>> recurringByClassGroup(
            @PathVariable Integer classGroupId) {
        return ResponseEntity.ok(scheduleService.listRecurringByClassGroup(classGroupId));
    }

    /**
     * GET /api/schedule/recurring/by-status?status=ACTIVE
     * Reservas recorrentes por status (ACTIVE | CANCELLED).
     */
    @GetMapping("/recurring/by-status")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<RecurringBookingDTO>> recurringByStatus(
            @RequestParam RecurringBooking.Status status) {
        return ResponseEntity.ok(scheduleService.listRecurringByStatus(status));
    }

    /**
     * GET /api/schedule/recurring/by-room-and-semester?roomId=1&semesterId=2
     * Reservas recorrentes de uma sala em um semestre específico.
     */
    @GetMapping("/recurring/by-room-and-semester")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<RecurringBookingDTO>> recurringByRoomAndSemester(
            @RequestParam Integer roomId,
            @RequestParam Integer semesterId) {
        return ResponseEntity.ok(scheduleService.listRecurringByRoomAndSemester(roomId, semesterId));
    }

    /**
     * GET /api/schedule/recurring/{id}/instances?start=2025-08-01&end=2025-08-31
     * Instâncias de uma reserva recorrente filtradas por intervalo de datas.
     */
    @GetMapping("/recurring/{id}/instances")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<RecurringBookingInstanceDTO>> instancesByDateRange(
            @PathVariable Integer id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(scheduleService.listInstancesByDateRange(id, start, end));
    }
}