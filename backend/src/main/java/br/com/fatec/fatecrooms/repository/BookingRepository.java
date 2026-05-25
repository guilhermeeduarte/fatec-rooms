package br.com.fatec.fatecrooms.repository;

import br.com.fatec.fatecrooms.model.Booking;
import br.com.fatec.fatecrooms.model.Booking.Status;
import br.com.fatec.fatecrooms.model.Period;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    // ── Conflito exato por ID de período ─────────────────────────────────────
    /**
     * Verifica se existe pelo menos uma reserva ativa (PENDING ou APPROVED)
     * para a mesma sala/data que ocupe exatamente um dos IDs de período informados.
     */
    @Query("""
        SELECT COUNT(b) > 0 FROM Booking b
        JOIN b.periods p
        WHERE b.room.id = :roomId
          AND p.id IN :periodIds
          AND b.bookingDate = :date
          AND b.status IN ('PENDING', 'APPROVED')
          AND (:excludeId IS NULL OR b.id <> :excludeId)
        """)
    boolean existsConflict(
            @Param("roomId")    Integer    roomId,
            @Param("periodIds") List<Integer> periodIds,
            @Param("date")      LocalDate  date,
            @Param("excludeId") Integer    excludeId
    );

    // ── Períodos já ocupados com seus horários (para detecção de sobreposição) ──

    @Query("""
        SELECT DISTINCT p FROM Booking b
        JOIN b.periods p
        WHERE b.room.id = :roomId
          AND b.bookingDate = :date
          AND b.status IN ('PENDING', 'APPROVED')
          AND (:excludeId IS NULL OR b.id <> :excludeId)
        """)
    List<Period> findOccupiedPeriodsWithTimes(
            @Param("roomId")    Integer   roomId,
            @Param("date")      LocalDate date,
            @Param("excludeId") Integer   excludeId
    );

    // ── IDs dos períodos ocupados (usado por getAvailability) ─────────────────
    @Query("""
        SELECT p.id FROM Booking b
        JOIN b.periods p
        WHERE b.room.id = :roomId
          AND b.bookingDate = :date
          AND b.status IN ('PENDING', 'APPROVED')
        """)
    List<Integer> findOccupiedPeriodIds(
            @Param("roomId") Integer roomId,
            @Param("date")   LocalDate date
    );

    // ── Reservas do usuário ───────────────────────────────────────────────────
    @Query("""
        SELECT DISTINCT b FROM Booking b
        LEFT JOIN FETCH b.periods
        WHERE b.user.id = :userId
        ORDER BY b.bookingDate DESC, b.createdAt DESC
        """)
    List<Booking> findByUserIdOrderByBookingDateDescCreatedAtDesc(@Param("userId") Integer userId);

    // ── Reservas por status ───────────────────────────────────────────────────
    @Query("""
        SELECT DISTINCT b FROM Booking b
        LEFT JOIN FETCH b.periods
        WHERE b.status = :status
        ORDER BY b.bookingDate ASC, b.createdAt ASC
        """)
    List<Booking> findByStatusOrderByBookingDateAscCreatedAtAsc(@Param("status") Status status);

    // ── Todas as reservas (visão do coordenador) ──────────────────────────────
    @Query("""
        SELECT DISTINCT b FROM Booking b
        JOIN FETCH b.room
        JOIN FETCH b.user
        LEFT JOIN FETCH b.periods
        ORDER BY b.bookingDate DESC, b.createdAt DESC
        """)
    List<Booking> findAllWithDetails();

    // ── Agenda do dia ─────────────────────────────────────────────────────────
    @Query("""
        SELECT DISTINCT b FROM Booking b
        JOIN FETCH b.room
        JOIN FETCH b.user
        LEFT JOIN FETCH b.periods
        WHERE b.bookingDate = :date
          AND b.status IN ('PENDING', 'APPROVED')
        ORDER BY b.bookingDate
        """)
    List<Booking> findByDateWithDetails(@Param("date") LocalDate date);

    // ── Reservas de uma sala num intervalo ────────────────────────────────────
    @Query("""
        SELECT DISTINCT b FROM Booking b
        LEFT JOIN FETCH b.periods
        JOIN FETCH b.user
        WHERE b.room.id = :roomId
          AND b.bookingDate BETWEEN :start AND :end
          AND b.status IN ('PENDING', 'APPROVED')
        ORDER BY b.bookingDate
        """)
    List<Booking> findByRoomAndDateRange(
            @Param("roomId") Integer   roomId,
            @Param("start")  LocalDate start,
            @Param("end")    LocalDate end
    );

    @Query(
            value = """
    SELECT DISTINCT b FROM Booking b
    JOIN FETCH b.room
    JOIN FETCH b.user
    LEFT JOIN FETCH b.periods
    ORDER BY b.bookingDate DESC, b.createdAt DESC
    """,
            countQuery = """
    SELECT COUNT(DISTINCT b)
    FROM Booking b
    """
    )
    Page<Booking> findAllWithDetailsPaged(Pageable pageable);

    @Query(
            value = """
    SELECT DISTINCT b FROM Booking b
    LEFT JOIN FETCH b.periods
    WHERE b.status = :status
    ORDER BY b.bookingDate ASC, b.createdAt ASC
    """,
            countQuery = """
    SELECT COUNT(DISTINCT b)
    FROM Booking b
    WHERE b.status = :status
    """
    )
    Page<Booking> findByStatusPaged(
            @Param("status") Status status,
            Pageable pageable);

    @Query(
            value = """
    SELECT DISTINCT b FROM Booking b
    JOIN FETCH b.room
    JOIN FETCH b.user
    LEFT JOIN FETCH b.periods
    WHERE b.bookingDate = :date
      AND b.status IN ('PENDING', 'APPROVED')
    ORDER BY b.bookingDate
    """,
            countQuery = """
    SELECT COUNT(DISTINCT b)
    FROM Booking b
    WHERE b.bookingDate = :date
      AND b.status IN ('PENDING', 'APPROVED')
    """
    )
    Page<Booking> findByDateWithDetailsPaged(
            @Param("date") LocalDate date,
            Pageable pageable);
}