package br.com.fatec.fatecrooms.DTO;

import br.com.fatec.fatecrooms.model.ClassGroup;
import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class CourseDTO {
    private Integer id;
    private String  name;
    private String  abbreviation;
    private boolean hasSaturday;
    private boolean isAnnual;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ClassGroup.Shift> allowedShifts;
}