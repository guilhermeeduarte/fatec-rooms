package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.BookingDTO;
import br.com.fatec.fatecrooms.DTO.DailyScheduleDTO;
import br.com.fatec.fatecrooms.DTO.RecurringBookingDTO;
import br.com.fatec.fatecrooms.DTO.RecurringBookingInstanceDTO;
import br.com.fatec.fatecrooms.model.*;
import br.com.fatec.fatecrooms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final BookingRepository                  bookingRepository;
    private final RecurringBookingRepository         recurringBookingRepository;
    private final RecurringBookingInstanceRepository instanceRepository;
    private final RoomRepository                     roomRepository;
    private final UserRepository                     userRepository;
    private final PeriodRepository                   periodRepository;
    private final HolidayRepository                  holidayRepository;
    private final BookingService                     bookingService;
    private final RecurringBookingService            recurringBookingService;

    //  TELA DE HORÁRIOS
    /**
     * Retorna todas as salas (ou uma sala específica) com todos os períodos do dia,
     * indicando se cada slot está livre, ocupado por reserva avulsa ou recorrente.
     * Ideal para a planilha de horários do coordenador.
     */
    @Transactional(readOnly = true)
    public DailyScheduleDTO getDailySchedule(LocalDate date, Integer roomId) {
        boolean isHoliday = holidayRepository.existsByHolidayDate(date);
        DayOfWeek dow = date.getDayOfWeek();

        List<Room> rooms = roomId != null
                ? roomRepository.findById(roomId).map(List::of).orElse(List.of())
                : roomRepository.findAll();

        // Períodos do dia (sábado → períodos de sábado; úteis → períodos normais)
        List<Period> periods = periodRepository.findByActiveOrderByStartTime((byte) 1)
                .stream()
                .filter(p -> {
                    boolean isSatPeriod = isSaturdayPeriod(p);
                    if (dow == DayOfWeek.SATURDAY) return isSatPeriod;
                    if (dow == DayOfWeek.SUNDAY)   return false;
                    return !isSatPeriod;
                })
                .toList();

        List<DailyScheduleDTO.RoomSchedule> roomSchedules = rooms.stream().map(room -> {
            // Reservas avulsas ativas no dia
            List<Booking> bookings = bookingRepository
                    .findByRoomAndDateRange(room.getId(), date, date)
                    .stream()
                    .filter(b -> b.getStatus() == Booking.Status.PENDING
                            || b.getStatus() == Booking.Status.APPROVED)
                    .toList();

            // Instâncias recorrentes ativas no dia
            List<RecurringBookingInstance> instances =
                    instanceRepository.findActiveByRoomAndDateRange(room.getId(), date, date);

            // Monta mapa periodId → ocupante
            Map<Integer, DailyScheduleDTO.SlotOccupant> occupantMap = new HashMap<>();

            for (Booking b : bookings) {
                DailyScheduleDTO.SlotOccupant occ = new DailyScheduleDTO.SlotOccupant(
                        "BOOKING", b.getId(), b.getSubject(),
                        b.getUser().getDisplayname() != null
                                ? b.getUser().getDisplayname()
                                : b.getUser().getFirstname() + " " + b.getUser().getLastname(),
                        b.getStatus(), null
                );
                b.getPeriods().forEach(p -> occupantMap.put(p.getId(), occ));
            }

            for (RecurringBookingInstance inst : instances) {
                RecurringBooking rb = inst.getRecurringBooking();
                DailyScheduleDTO.SlotOccupant occ = new DailyScheduleDTO.SlotOccupant(
                        "RECURRING", rb.getId(), rb.getSubject(),
                        rb.getClassGroup().getLabel(),
                        null, inst.getStatus()
                );
                rb.getPeriods().forEach(p -> occupantMap.putIfAbsent(p.getId(), occ));
            }

            List<DailyScheduleDTO.PeriodSlot> slots = periods.stream().map(p -> {
                DailyScheduleDTO.SlotOccupant occupant = occupantMap.get(p.getId());
                DailyScheduleDTO.SlotStatus status;

                if (isHoliday && occupant == null) {
                    status = DailyScheduleDTO.SlotStatus.HOLIDAY;
                } else if (occupant == null) {
                    status = DailyScheduleDTO.SlotStatus.FREE;
                } else if ("RECURRING".equals(occupant.getType())) {
                    status = DailyScheduleDTO.SlotStatus.RECURRING;
                } else {
                    status = DailyScheduleDTO.SlotStatus.BOOKED;
                }

                return new DailyScheduleDTO.PeriodSlot(
                        p.getId(), p.getName(), p.getStartTime(), p.getEndTime(),
                        status, occupant
                );
            }).toList();

            return new DailyScheduleDTO.RoomSchedule(
                    room.getId(), room.getName(), room.getLocation(), slots);
        }).toList();

        return new DailyScheduleDTO(date, roomSchedules);
    }

    /** Reservas avulsas de uma sala específica (todos os status). */
    @Transactional(readOnly = true)
    public List<BookingDTO> listByRoom(Integer roomId) {
        return bookingRepository.findAllWithDetails().stream()
                .filter(b -> b.getRoom().getId().equals(roomId))
                .map(bookingService::toDTO)
                .toList();
    }

    /** Reservas avulsas de um usuário específico (visão do coordenador). */
    @Transactional(readOnly = true)
    public List<BookingDTO> listByUser(Integer userId) {
        return bookingRepository
                .findByUserIdOrderByBookingDateDescCreatedAtDesc(userId)
                .stream().map(bookingService::toDTO).toList();
    }


    /** Reservas recorrentes de uma sala específica. */
    @Transactional(readOnly = true)
    public List<RecurringBookingDTO> listRecurringByRoom(Integer roomId) {
        return recurringBookingRepository.findAllWithDetails().stream()
                .filter(rb -> rb.getRoom().getId().equals(roomId))
                .map(recurringBookingService::toDTO)
                .toList();
    }

    /** Reservas recorrentes de uma turma específica. */
    @Transactional(readOnly = true)
    public List<RecurringBookingDTO> listRecurringByClassGroup(Integer classGroupId) {
        return recurringBookingRepository.findAllWithDetails().stream()
                .filter(rb -> rb.getClassGroup().getId().equals(classGroupId))
                .map(recurringBookingService::toDTO)
                .toList();
    }

    /** Reservas recorrentes por status. */
    @Transactional(readOnly = true)
    public List<RecurringBookingDTO> listRecurringByStatus(RecurringBooking.Status status) {
        return recurringBookingRepository.findAllWithDetails().stream()
                .filter(rb -> rb.getStatus() == status)
                .map(recurringBookingService::toDTO)
                .toList();
    }

    /** Reservas recorrentes por sala + semestre combinados. */
    @Transactional(readOnly = true)
    public List<RecurringBookingDTO> listRecurringByRoomAndSemester(Integer roomId, Integer semesterId) {
        return recurringBookingRepository.findBySemesterWithDetails(semesterId).stream()
                .filter(rb -> rb.getRoom().getId().equals(roomId))
                .map(recurringBookingService::toDTO)
                .toList();
    }

    /** Instâncias de uma recorrente filtradas por intervalo de datas. */
    @Transactional(readOnly = true)
    public List<RecurringBookingInstanceDTO> listInstancesByDateRange(
            Integer recurringBookingId, LocalDate start, LocalDate end) {
        return instanceRepository
                .findByRecurringAndDateRange(recurringBookingId, start, end)
                .stream().map(recurringBookingService::instanceToDTO).toList();
    }


    private boolean isSaturdayPeriod(Period p) {
        String name = p.getName() == null ? "" : p.getName().replaceAll("\\s+", "").toLowerCase();
        return name.contains("sabado") || name.contains("sábado");
    }
}