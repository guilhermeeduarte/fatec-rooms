package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.RecurringBookingReportDTO;
import br.com.fatec.fatecrooms.DTO.RoomReportDTO;
import br.com.fatec.fatecrooms.model.Booking;
import br.com.fatec.fatecrooms.model.RecurringBooking;
import br.com.fatec.fatecrooms.model.RecurringBookingInstance;
import br.com.fatec.fatecrooms.repository.BookingRepository;
import br.com.fatec.fatecrooms.repository.RecurringBookingRepository;
import br.com.fatec.fatecrooms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final RoomRepository              roomRepository;
    private final BookingRepository           bookingRepository;
    private final RecurringBookingRepository  recurringBookingRepository;

    @Transactional(readOnly = true)
    public List<RoomReportDTO> getRoomsReport() {
        List<Booking>          allBookings   = bookingRepository.findAll();
        List<RecurringBooking> allRecurring  = recurringBookingRepository.findAllWithDetails();

        // Agrupar instâncias por roomId para evitar N+1
        Map<Integer, List<RecurringBookingInstance>> instancesByRoom = allRecurring.stream()
                .collect(Collectors.toMap(
                        rb -> rb.getRoom().getId(),
                        RecurringBooking::getInstances,
                        (a, b) -> { a.addAll(b); return a; }
                ));

        return roomRepository.findAll().stream().map(room -> {
            // ── Reservas avulsas ────────────────────────────────────────────
            List<Booking> roomBookings = allBookings.stream()
                    .filter(b -> b.getRoom().getId().equals(room.getId()))
                    .toList();

            long total     = roomBookings.size();
            long approved  = roomBookings.stream().filter(b -> b.getStatus() == Booking.Status.APPROVED).count();
            long pending   = roomBookings.stream().filter(b -> b.getStatus() == Booking.Status.PENDING).count();
            long cancelled = roomBookings.stream().filter(b -> b.getStatus() == Booking.Status.CANCELLED).count();
            long rejected  = roomBookings.stream().filter(b -> b.getStatus() == Booking.Status.REJECTED).count();

            // ── Reservas recorrentes ────────────────────────────────────────
            List<RecurringBookingInstance> roomInstances =
                    instancesByRoom.getOrDefault(room.getId(), List.of());

            long rTotal     = roomInstances.size();
            long rActive    = roomInstances.stream()
                    .filter(i -> i.getStatus() == RecurringBookingInstance.Status.ACTIVE).count();
            long rCancelled = roomInstances.stream()
                    .filter(i -> i.getStatus() == RecurringBookingInstance.Status.CANCELLED).count();
            long rSkipped   = roomInstances.stream()
                    .filter(i -> i.getStatus() == RecurringBookingInstance.Status.SKIPPED).count();

            // ── Combinado: avulsas aprovadas + instâncias ativas ────────────
            long combined = approved + rActive;

            return new RoomReportDTO(
                    room.getId(),
                    room.getName(),
                    room.getLocation(),
                    total, approved, pending, cancelled, rejected,
                    rTotal, rActive, rCancelled, rSkipped,
                    combined
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<RecurringBookingReportDTO> getRecurringBookingsReport() {
        return recurringBookingRepository.findAllWithDetails().stream().map(rb -> {
            List<RecurringBookingInstance> insts = rb.getInstances();
            long active    = insts.stream().filter(i -> i.getStatus() == RecurringBookingInstance.Status.ACTIVE).count();
            long cancelled = insts.stream().filter(i -> i.getStatus() == RecurringBookingInstance.Status.CANCELLED).count();
            long skipped   = insts.stream().filter(i -> i.getStatus() == RecurringBookingInstance.Status.SKIPPED).count();

            return new RecurringBookingReportDTO(
                    rb.getId(),
                    rb.getRoom().getName(),
                    rb.getRoom().getLocation(),
                    rb.getSemester().getName(),
                    rb.getClassGroup().getLabel(),
                    rb.getClassGroup().getCourse().getName(),
                    rb.getSubject(),
                    rb.getStatus().name(),
                    insts.size(),
                    (int) active,
                    (int) cancelled,
                    (int) skipped
            );
        }).toList();
    }
}
