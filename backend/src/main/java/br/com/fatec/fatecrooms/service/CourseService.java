package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.CourseDTO;
import br.com.fatec.fatecrooms.DTO.CourseRequest;
import br.com.fatec.fatecrooms.exception.BusinessException;
import br.com.fatec.fatecrooms.exception.ResourceNotFoundException;
import br.com.fatec.fatecrooms.model.ClassGroup;
import br.com.fatec.fatecrooms.model.Course;
import br.com.fatec.fatecrooms.model.CourseAllowedShift;
import br.com.fatec.fatecrooms.repository.ClassGroupRepository;
import br.com.fatec.fatecrooms.repository.CourseAllowedShiftRepository;
import br.com.fatec.fatecrooms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository             courseRepository;
    private final ClassGroupRepository         classGroupRepository;
    private final CourseAllowedShiftRepository allowedShiftRepository;

    // ── Shifts válidos por tipo de curso ────────────────────────────────────
    private static final Set<ClassGroup.Shift> ANNUAL_SHIFTS =
            Set.of(ClassGroup.Shift.YEAR_1, ClassGroup.Shift.YEAR_2);
    private static final Set<ClassGroup.Shift> SEMESTER_SHIFTS =
            Set.of(ClassGroup.Shift.MORNING, ClassGroup.Shift.AFTERNOON, ClassGroup.Shift.EVENING);

    // ── Consultas ───────────────────────────────────────────────────────────

    public List<CourseDTO> listActive() {
        return courseRepository.findByActiveOrderByNameAsc((byte) 1)
                .stream().map(this::toDTO).toList();
    }

    public List<CourseDTO> listAll() {
        return courseRepository.findAll().stream().map(this::toDTO).toList();
    }

    public CourseDTO findById(Integer id) {
        return toDTO(getOrThrow(id));
    }

    // ── Operações ───────────────────────────────────────────────────────────

    @Transactional
    public CourseDTO create(CourseRequest request) {
        String name         = request.getName().trim();
        String abbreviation = request.getAbbreviation().trim().toUpperCase();

        if (courseRepository.existsByNameIgnoreCase(name))
            throw new BusinessException("Já existe um curso com o nome '" + name + "'.");
        if (courseRepository.existsByAbbreviationIgnoreCase(abbreviation))
            throw new BusinessException("Já existe um curso com a abreviação '" + abbreviation + "'.");

        validateShifts(request);

        Course course = new Course();
        course.setName(name);
        course.setAbbreviation(abbreviation);
        course.setHasSaturday(request.isHasSaturday() ? (byte) 1 : (byte) 0);
        course.setIsAnnual(request.isAnnual() ? (byte) 1 : (byte) 0);
        course.setActive((byte) 1);
        Course saved = courseRepository.save(course);

        saveAllowedShifts(saved, request.getAllowedShifts());
        generateClassGroups(saved, request.getAllowedShifts());
        return toDTO(saved);
    }

    @Transactional
    public CourseDTO update(Integer id, CourseRequest request) {
        Course course = getOrThrow(id);
        String name         = request.getName().trim();
        String abbreviation = request.getAbbreviation().trim().toUpperCase();

        if (!course.getName().equalsIgnoreCase(name)
                && courseRepository.existsByNameIgnoreCase(name))
            throw new BusinessException("Já existe um curso com o nome '" + name + "'.");
        if (!course.getAbbreviation().equalsIgnoreCase(abbreviation)
                && courseRepository.existsByAbbreviationIgnoreCase(abbreviation))
            throw new BusinessException("Já existe um curso com a abreviação '" + abbreviation + "'.");

        validateShifts(request);

        boolean annualChanged       = (course.getIsAnnual() == 1) != request.isAnnual();
        boolean abbreviationChanged = !course.getAbbreviation().equalsIgnoreCase(abbreviation);

        course.setName(name);
        course.setAbbreviation(abbreviation);
        course.setHasSaturday(request.isHasSaturday() ? (byte) 1 : (byte) 0);
        course.setIsAnnual(request.isAnnual() ? (byte) 1 : (byte) 0);
        Course saved = courseRepository.save(course);

        // Recria allowed shifts
        allowedShiftRepository.deleteByCourseId(id);
        saveAllowedShifts(saved, request.getAllowedShifts());

        // Recria turmas se mudou turno, abreviação ou tipo anual
        List<ClassGroup.Shift> currentShifts = classGroupRepository.findByCourseId(id)
                .stream().map(ClassGroup::getShift).distinct().toList();
        boolean shiftsChanged = !currentShifts.containsAll(request.getAllowedShifts())
                || !request.getAllowedShifts().containsAll(currentShifts);

        if (annualChanged || abbreviationChanged || shiftsChanged) {
            classGroupRepository.findByCourseId(id).forEach(classGroupRepository::delete);
            generateClassGroups(saved, request.getAllowedShifts());
        } else if (!course.getAbbreviation().equalsIgnoreCase(abbreviation)) {
            // Só atualiza labels
            classGroupRepository.findByCourseId(id).forEach(cg -> {
                cg.setLabel(buildLabel(saved, cg.getCourseSemester(), cg.getShift()));
                classGroupRepository.save(cg);
            });
        }

        return toDTO(saved);
    }

    @Transactional
    public String delete(Integer id) {
        Course course = getOrThrow(id);
        courseRepository.delete(course);
        return "Curso '" + course.getName() + "' removido com sucesso.";
    }

    @Transactional
    public CourseDTO toggleActive(Integer id) {
        Course course = getOrThrow(id);
        course.setActive(course.getActive() == 1 ? (byte) 0 : (byte) 1);
        return toDTO(courseRepository.save(course));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void validateShifts(CourseRequest request) {
        List<ClassGroup.Shift> shifts = request.getAllowedShifts();
        if (request.isAnnual()) {
            boolean hasInvalid = shifts.stream().anyMatch(s -> !ANNUAL_SHIFTS.contains(s));
            if (hasInvalid)
                throw new BusinessException("Cursos anuais só aceitam os turnos YEAR_1 e YEAR_2.");
        } else {
            boolean hasInvalid = shifts.stream().anyMatch(s -> !SEMESTER_SHIFTS.contains(s));
            if (hasInvalid)
                throw new BusinessException("Cursos semestrais só aceitam MORNING, AFTERNOON e EVENING.");
        }
    }

    private void saveAllowedShifts(Course course, List<ClassGroup.Shift> shifts) {
        shifts.forEach(shift -> {
            CourseAllowedShift cas = new CourseAllowedShift();
            CourseAllowedShift.CourseAllowedShiftId casId = new CourseAllowedShift.CourseAllowedShiftId();
            casId.setCourseId(course.getId());
            casId.setShift(shift);
            cas.setId(casId);
            cas.setCourse(course);
            allowedShiftRepository.save(cas);
        });
    }

    private void generateClassGroups(Course course, List<ClassGroup.Shift> shifts) {
        boolean isAnnual = course.getIsAnnual() == 1;

        if (isAnnual) {
            // AMS: apenas YEAR_1 e YEAR_2
            for (ClassGroup.Shift shift : shifts) {
                if (!ANNUAL_SHIFTS.contains(shift)) continue;
                byte year = shift == ClassGroup.Shift.YEAR_1 ? (byte) 1 : (byte) 2;
                ClassGroup cg = new ClassGroup();
                cg.setCourse(course);
                cg.setCourseSemester(year);
                cg.setShift(shift);
                cg.setHasSaturday((byte) 0);
                cg.setLabel(buildLabel(course, year, shift));
                cg.setActive((byte) 1);
                classGroupRepository.save(cg);
            }
        } else {
            // Cursos normais: 6 semestres × turnos permitidos
            for (byte sem = 1; sem <= 6; sem++) {
                for (ClassGroup.Shift shift : shifts) {
                    if (!SEMESTER_SHIFTS.contains(shift)) continue;
                    ClassGroup cg = new ClassGroup();
                    cg.setCourse(course);
                    cg.setCourseSemester(sem);
                    cg.setShift(shift);
                    cg.setHasSaturday(course.getHasSaturday());
                    cg.setLabel(buildLabel(course, sem, shift));
                    cg.setActive((byte) 1);
                    classGroupRepository.save(cg);
                }
            }
        }
    }

    private String buildLabel(Course course, byte semesterOrYear, ClassGroup.Shift shift) {
        boolean isAnnual = course.getIsAnnual() == 1;
        if (isAnnual) {
            String year = semesterOrYear == 1 ? "1º Ano" : "2º Ano";
            return course.getAbbreviation() + " " + year + " Noturno";
        }
        String shiftPt = switch (shift) {
            case MORNING   -> "Manhã";
            case AFTERNOON -> "Tarde";
            case EVENING   -> "Noite";
            default        -> shift.name();
        };
        return semesterOrYear + "º " + course.getAbbreviation() + " " + shiftPt;
    }

    private Course getOrThrow(Integer id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Curso não encontrado: " + id));
    }

    public CourseDTO toDTO(Course c) {
        List<ClassGroup.Shift> shifts = allowedShiftRepository.findShiftsByCourseId(c.getId());
        return new CourseDTO(
                c.getId(), c.getName(), c.getAbbreviation(),
                c.getHasSaturday() == 1,
                c.getIsAnnual() == 1,
                c.getActive() == 1,
                c.getCreatedAt(), c.getUpdatedAt(),
                shifts
        );
    }
}