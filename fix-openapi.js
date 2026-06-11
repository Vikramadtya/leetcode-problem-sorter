const fs = require('fs');
let content = fs.readFileSync('api-contract/openapi.yaml', 'utf8');

const commentSchema = `
    # ----------------------------------------------------------------
    # Comments
    # ----------------------------------------------------------------
    Comment:
      type: object
      required: [id, question_id, content, created_at]
      properties:
        id:
          type: string
          format: uuid
        question_id:
          type: string
          format: uuid
        content:
          type: string
        created_at:
          type: string
          format: date-time

    CommentRequest:
      type: object
      required: [content]
      properties:
        content:
          type: string
          minLength: 1
          maxLength: 10000

    CommentsResponse:
      type: object
      required: [comments]
      properties:
        comments:
          type: array
          items:
            $ref: '#/components/schemas/Comment'
`;

content = content.replace(/    # ----------------------------------------------------------------\n    # System & Health/, commentSchema + '\n    # ----------------------------------------------------------------\n    # System & Health');

const commentPaths = `
  /api/v1/questions/{id}/comments:
    get:
      operationId: getComments
      tags: [Questions]
      summary: Get comments for a question
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: List of comments
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CommentsResponse'
        '404':
          description: Question not found
    post:
      operationId: addComment
      tags: [Questions]
      summary: Add a comment to a question
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CommentRequest'
      responses:
        '201':
          description: Created comment
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Comment'

`;

content = content.replace(/  \/health:/, commentPaths + '  /health:');

fs.writeFileSync('api-contract/openapi.yaml', content);
