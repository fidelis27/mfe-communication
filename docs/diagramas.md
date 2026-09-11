# Diagramas do banco e da arquitetura

## Modelo relacional inicial

O banco usa MariaDB/MySQL. O estudante possui um cadastro único; o vínculo
com uma instituição fica em `enrollments`, permitindo transferência,
trancamento, reabertura e histórico sem duplicar o estudante.

```mermaid
erDiagram
		INSTITUTION ||--o{ CAMPUS : possui
		INSTITUTION ||--o{ COURSE : oferece
		CAMPUS ||--o{ COURSE : disponibiliza
		STUDENT ||--o{ ENROLLMENT : possui
		INSTITUTION ||--o{ ENROLLMENT : recebe
		CAMPUS ||--o{ ENROLLMENT : ocorre_em
		COURSE ||--o{ ENROLLMENT : vincula

		USER ||--o{ GROUP_MEMBER : participa
		GROUP ||--o{ GROUP_MEMBER : possui
		INSTITUTION ||--o{ GROUP : organiza

		USER ||--o{ AUDIT_EVENT : provoca
		INSTITUTION ||--o{ AUDIT_EVENT : pertence_a
		STUDENT ||--o{ AUDIT_EVENT : referencia
		ENROLLMENT ||--o{ AUDIT_EVENT : referencia

		INSTITUTION {
				string id PK
				string legal_name
				string trade_name
				string acronym
				string type
				string city
				string state_code
				string status
				datetime created_at
				datetime updated_at
		}

		CAMPUS {
				string id PK
				string institution_id FK
				string name
				string code
				string city
				string state_code
				string status
		}

		COURSE {
				string id PK
				string institution_id FK
				string campus_id FK
				string name
				string code
				string modality
				string status
		}

		STUDENT {
				string id PK
				string internal_code UK
				string full_name
				string social_name
				string masked_document
				string status
				datetime created_at
				datetime updated_at
		}

		ENROLLMENT {
				string id PK
				string student_id FK
				string institution_id FK
				string campus_id FK
				string course_id FK
				string status
				date started_at
				date suspended_at
				date ended_at
				string end_reason
		}

		USER {
				string id PK
				string name
				string email UK
				string status
				boolean super_admin
		}

		GROUP {
				string id PK
				string institution_id FK
				string name
				string status
		}

		GROUP_MEMBER {
				string user_id PK_FK
				string group_id PK_FK
				string role
				datetime created_at
		}

		AUDIT_EVENT {
				string event_id PK
				string type
				int version
				string source
				string correlation_id
				string actor_user_id FK
				string institution_id FK
				string student_id FK
				string enrollment_id FK
				json payload
				datetime occurred_at
		}
```

## Regras de relacionamento

- Uma `INSTITUTION` pode possuir vários `CAMPUS`.
- Uma `INSTITUTION` pode oferecer vários `COURSE`.
- Um `COURSE` pertence a uma instituição e pode estar associado a um campus.
- Um `STUDENT` não aponta diretamente para uma instituição.
- Um `STUDENT` possui um ou mais `ENROLLMENT` ao longo do tempo.
- O MVP permite no máximo um `ENROLLMENT` com status `active` por estudante.
- Uma transferência encerra o vínculo de origem e cria o vínculo de destino
	na mesma transação MariaDB/MySQL.
- Um trancamento altera o status do vínculo para `suspended` sem excluir
	histórico; a reabertura retorna para `active`.
- `GROUP_MEMBER` resolve a relação muitos-para-muitos entre usuários e grupos.
- O papel do usuário é aplicado dentro do escopo do grupo/instituição.
- `AUDIT_EVENT` é persistido antes de ser distribuído pelo WebSocket.
- Activity pode projetar eventos a partir de `AUDIT_EVENT`; Dashboard pode
	manter projeções derivadas, mas não substitui os dados autoritativos.

## Constraints obrigatórias

- `institution.id`, `campus.id`, `course.id`, `student.id`,
	`enrollment.id` e `user.id` são chaves primárias.
- `student.internal_code` é único conforme a regra de identificação adotada.
- `user.email` é único.
- `enrollment.student_id`, `institution_id`, `course_id` e status são
	obrigatórios.
- Foreign keys devem estar ativas.
- Transferência e mudança de matrícula devem usar transação.
- Datas de encerramento não podem ser anteriores à data de início.
- Documentos pessoais não devem ser usados como chave pública nem aparecer em
	logs.
- O payload completo do evento deve respeitar a política de minimização de
	dados e, se necessário, ser criptografado ou protegido por acesso.

## Decisões ainda necessárias antes das migrations

- Definir se `internal_code` é único globalmente ou apenas dentro da
	instituição.
- Definir se um curso pode existir em mais de um campus sem duplicação.
- Escolher o formato de ID: UUID ou string gerada pela aplicação.
- Definir o mecanismo de migrations Go.
- Definir política de retenção de `AUDIT_EVENT`.
