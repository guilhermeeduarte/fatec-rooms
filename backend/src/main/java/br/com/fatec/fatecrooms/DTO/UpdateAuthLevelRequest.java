package br.com.fatec.fatecrooms.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateAuthLevelRequest {

    @NotNull(message = "O authlevel é obrigatório.")
    @Min(value = 1, message = "O authlevel mínimo é 1 (coordenador).")
    @Max(value = 2, message = "O authlevel máximo é 2 (professor).")
    private Byte authlevel;
}