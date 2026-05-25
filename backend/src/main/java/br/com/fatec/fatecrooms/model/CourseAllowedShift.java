package br.com.fatec.fatecrooms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "course_allowed_shifts")
public class CourseAllowedShift {

    @EmbeddedId
    private CourseAllowedShiftId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("courseId")
    @JoinColumn(name = "course_id")
    private Course course;

    @Embeddable
    @Getter
    @Setter
    public static class CourseAllowedShiftId implements java.io.Serializable {
        @Column(name = "course_id")
        private Integer courseId;

        @Enumerated(EnumType.STRING)
        @Column(name = "shift", length = 20)
        private ClassGroup.Shift shift;
    }
}