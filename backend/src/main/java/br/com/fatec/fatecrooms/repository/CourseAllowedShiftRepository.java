package br.com.fatec.fatecrooms.repository;

import br.com.fatec.fatecrooms.model.ClassGroup;
import br.com.fatec.fatecrooms.model.CourseAllowedShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CourseAllowedShiftRepository
        extends JpaRepository<CourseAllowedShift, CourseAllowedShift.CourseAllowedShiftId> {

    @Query("SELECT cas.id.shift FROM CourseAllowedShift cas WHERE cas.id.courseId = :courseId")
    List<ClassGroup.Shift> findShiftsByCourseId(@Param("courseId") Integer courseId);

    @Modifying
    @Transactional
    @Query("DELETE FROM CourseAllowedShift cas WHERE cas.id.courseId = :courseId")
    void deleteByCourseId(@Param("courseId") Integer courseId);
}