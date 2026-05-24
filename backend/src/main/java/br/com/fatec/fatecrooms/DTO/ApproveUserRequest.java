package br.com.fatec.fatecrooms.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApproveUserRequest {

    @NotNull(message = "O authlevel é obrigatório.")
    @Min(value = 1, message = "Use 1 para coordenador ou 2 para professor.")
    @Max(value = 2, message = "Use 1 para coordenador ou 2 para professor.")
    private Byte authlevel;
}