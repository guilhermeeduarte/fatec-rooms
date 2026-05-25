package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.ClassGroupDTO;
import br.com.fatec.fatecrooms.exception.ResourceNotFoundException;
import br.com.fatec.fatecrooms.model.ClassGroup;
import br.com.fatec.fatecrooms.repository.ClassGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassGroupService {

    private final ClassGroupRepository classGroupRepository;

    public List<ClassGroupDTO> listAllActive() {
        return classGroupRepository.findAllActiveWithCourse()
                .stream().map(this::toDTO).toList();
    }

    public List<ClassGroupDTO> listByCourse(Integer courseId) {
        return classGroupRepository.findActiveByCourseId(courseId)
                .stream().map(this::toDTO).toList();
    }

    public ClassGroupDTO findById(Integer id) {
        return toDTO(classGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada: " + id)));
    }

    public ClassGroupDTO toDTO(ClassGroup cg) {
        String shiftLabel = switch (cg.getShift()) {
            case MORNING   -> "Manhã";
            case AFTERNOON -> "Tarde";
            case EVENING   -> "Noite";
            case YEAR_1    -> "1º Ano";
            case YEAR_2    -> "2º Ano";
        };
        return new ClassGroupDTO(
                cg.getId(),
                cg.getCourse().getId(),
                cg.getCourse().getName(),
                cg.getCourse().getAbbreviation(),
                cg.getCourse().getIsAnnual() == 1,
                cg.getCourseSemester(),
                cg.getShift(),
                shiftLabel,
                cg.getHasSaturday() == 1,
                cg.getLabel(),
                cg.getActive() == 1
        );
    }
}